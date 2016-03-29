var baiduAPI = {
    translateV2: 'http://fanyi.baidu.com/v2transapi'
};

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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!!request.url) {
        chrome.tabs.create({'url': request.url});
    } else if(!!request.wordText) {
        $.ajax({
            url: baiduAPI.translateV2,
            async: false,
            timeout: 10000,
            data: {
                from: 'en',
                to: 'zh',
                query: request.wordText,
                transtype: 'realtime',
                simple_means_flag: 3
            },
            method: 'POST'
        })
        .done(function (result) {
            sendResponse(result);
        })
        .fail(function () {
            sendResponse(null);
        });
    }
});

