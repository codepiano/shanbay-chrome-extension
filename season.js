chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
    console.log(JSON.stringify(details));
    var headers = details.requestHeaders,
        blockingResponse = {};
    for (var i = 0, l = headers.length; i < l; ++i) {
        if (headers[i].name === 'Origin' || headers[i].name === 'Referer') {
            headers[i].value = 'http://fanyi.baidu.com/';
            continue;
        }
    }
    blockingResponse.requestHeaders = headers;
    return blockingResponse;
}, {urls: ["http://fanyi.baidu.com/v2transapi"]}, ['requestHeaders', 'blocking']);
