/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * A test board for a plain browser tab only (the mock context). Inside monday the board
   * comes from monday's context. Not a secret: the number in the board URL after /boards/.
   */
  readonly VITE_DEV_BOARD_ID?: string
}
