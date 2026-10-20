/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Not a secret: the number in your board URL after /boards/. */
  readonly VITE_MONDAY_BOARD_ID?: string
}
