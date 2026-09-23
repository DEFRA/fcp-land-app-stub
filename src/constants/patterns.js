// Allows digits, spaces, brackets, and an optional leading +, but requires at least one digit.
// The (?=...) part checks a digit exists first for efficiency and time complexity.
export const PHONE_NUMBER_PATTERN = /^\+?(?=[\d ()]*\d)[\d ()]*$/

// Rejects control characters — C0 (0x00–0x1f), DEL (0x7f) and C1 (0x80–0x9f) — which have no valid
// use in text input fields. The Unicode C1 block contains only control characters, so this does not
// reject legitimate input — accented letters, symbols and NBSP all sit at U+00A0 and above.
// eslint-disable-next-line no-control-regex
export const NO_CONTROL_CHARS_PATTERN = /^[^\x00-\x1f\x7f-\x9f]*$/
