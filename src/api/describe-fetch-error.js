// fetch reports connectivity problems as a generic "fetch failed" TypeError, with the real
// reason (ECONNREFUSED, ENOTFOUND, certificate errors...) on error.cause, which ECS log
// formatting does not output. Timeouts surface as a TimeoutError with no cause.
function describeFetchError (error) {
  const cause = error.cause
  const detail = [cause?.code, cause?.message].filter(Boolean).join(' ')

  return detail ? `${error.message} (${detail})` : `${error.name}: ${error.message}`
}

export { describeFetchError }
