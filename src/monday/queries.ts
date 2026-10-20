// The only two operations the game sends to monday. The dev-only endpoint
// (vite-plugins/monday-dev-api.ts) refuses anything that is not in this list,
// so even a request that sneaks past the other checks cannot do more than this.
// Looked up in the monday API docs: create_group and create_item.

export const CREATE_GROUP = /* GraphQL */ `
  mutation CreateGroup($boardId: ID!, $groupName: String!) {
    create_group(board_id: $boardId, group_name: $groupName) {
      id
    }
  }
`

export const CREATE_ITEM = /* GraphQL */ `
  mutation CreateItem($boardId: ID!, $groupId: String!, $itemName: String!) {
    create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName) {
      id
    }
  }
`

export const ALLOWED_OPERATIONS: readonly string[] = [CREATE_GROUP, CREATE_ITEM]

/** Path of the dev-only endpoint. It only exists in `npm run dev`. */
export const DEV_ENDPOINT = '/__monday'
