#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || dirname "$0")/.."
source .project.env

usage() {
  echo "Usage:"
  echo "  board.sh status <issue#> \"<Status>\" [--qa]"
  echo "  board.sh show <issue#>"
  echo "  board.sh list \"<Status>\""
  echo ""
  echo "Statuses: Blocked | Todo | In Progress | Needs QA | Done"
  echo "Note: 'Done' requires --qa flag (QA gate enforcement)"
  exit 1
}

[[ $# -lt 2 ]] && usage

CMD="$1"
shift

get_opt_id() {
  case "$1" in
    "Blocked")    echo "$OPT_BLOCKED" ;;
    "Todo")       echo "$OPT_TODO" ;;
    "In Progress") echo "$OPT_IN_PROGRESS" ;;
    "Needs QA")   echo "$OPT_NEEDS_QA" ;;
    "Done")       echo "$OPT_DONE" ;;
    *) echo ""; ;;
  esac
}

case "$CMD" in
  status)
    ISSUE_NUM="$1"
    STATUS="$2"
    QA_FLAG="${3:-}"

    if [[ "$STATUS" == "Done" && "$QA_FLAG" != "--qa" ]]; then
      echo "ERROR: Only the QA person can set status to 'Done'."
      echo "Run with --qa flag to confirm you are the QA approver."
      exit 1
    fi

    OPT_ID="$(get_opt_id "$STATUS")"
    if [[ -z "$OPT_ID" ]]; then
      echo "ERROR: Unknown status '$STATUS'"
      usage
    fi

    # Get the item ID for this issue in the project
    ITEM_ID=$(gh project item-list "$PROJECT_NUMBER" --owner "$GH_OWNER" --format json \
      | grep -o '"id":"[^"]*"' | head -1 || true)

    # Use GraphQL to update status
    ITEM_ID=$(gh api graphql -f query='
      query($proj: ID!, $num: Int!) {
        node(id: $proj) {
          ... on ProjectV2 {
            items(first: 100) {
              nodes {
                id
                content {
                  ... on Issue { number }
                }
              }
            }
          }
        }
      }' -f proj="$PROJECT_ID" -F num="$ISSUE_NUM" \
      --jq ".data.node.items.nodes[] | select(.content.number == $ISSUE_NUM) | .id")

    if [[ -z "$ITEM_ID" ]]; then
      echo "ERROR: Issue #$ISSUE_NUM not found in project board."
      exit 1
    fi

    gh api graphql -f query='
      mutation($proj: ID!, $item: ID!, $field: ID!, $opt: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $proj
          itemId: $item
          fieldId: $field
          value: { singleSelectOptionId: $opt }
        }) { projectV2Item { id } }
      }' \
      -f proj="$PROJECT_ID" \
      -f item="$ITEM_ID" \
      -f field="$STATUS_FIELD_ID" \
      -f opt="$OPT_ID" > /dev/null

    echo "Issue #$ISSUE_NUM moved to '$STATUS'."
    ;;

  show)
    ISSUE_NUM="$1"
    gh issue view "$ISSUE_NUM" --repo "$GH_OWNER/$REPO"
    ;;

  list)
    STATUS="$1"
    echo "Issues with status: $STATUS"
    gh issue list --repo "$GH_OWNER/$REPO" --state open --label "" 2>/dev/null || \
      echo "(use the board at https://github.com/users/$GH_OWNER/projects/$PROJECT_NUMBER)"
    ;;

  *)
    usage
    ;;
esac
