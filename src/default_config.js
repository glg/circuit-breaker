module.exports = {
    window: 5,  // length of window in seconds
    threshold: 10, // # of errors and timouts tolerated within window
    request_timeout: 30, // # of seconds before request is considered failed
    cb_timeout: 60, // Amount of time that CB remains closed before changing to half open
}