var review = $('#review');
var observer = new MutationObserver(reviewContentChange);
var config = { childList: true };
observer.observe(review[0], config);

var len = 0;
var step = 14;
var shanbayAPI = {
    wordsList : 'http://www.shanbay.com/api/v1/bdc/review/',
    wordDefines : 'http://www.shanbay.com/api/v1/bdc/vocabulary/definitions/',
    wordExample: 'http://www.shanbay.com/api/v1/bdc/example/sys/'
};
var current_word;

var WordsBook = {};

function reviewContentChange(mutations) {
    // 判断是否插入了 DOM 节点
    var mutation = _.find(mutations, function(mutation){return mutation.addedNodes.length > 0;});
    if(!mutation) {
        return;
    }
    // 判断添加的是不是 learning-box 元素，该元素包含单词的详细解释
    var learningBox = _.find(mutation.addedNodes, function(node){return node.id === 'learning-box';});
    if(!learningBox || !learningBox.children || learningBox.children.length === 0) {
        return;
    }
    // 找出包含单词详细解释的 div 元素
    var learningDetailContainer = _.find(learningBox.children, function(node){return _.includes(node.classList, 'learning-detail-container') && !_.includes(node.classList, 'hide');});
    if(!learningDetailContainer) {
        return;
    }
    if(len === 0) {
        loadWordList(changeView);
    } else {
        changeView();
    }

    function changeView() {
        var word = $('#learning_word h1.content');
        if(!word) {
            return;
        }
        var wordText = $.trim(word.contents().get(0).nodeValue);
        if(wordText === current_word) {
            return;
        }
        collinsSalad(wordText);
        $('#learning-examples-box').remove();
        $('#notes-box').remove();
    }
}

function collinsSalad(word) {
    var allDefn = $('div#review-definitions > div.well > div.allDefn');
    if(!allDefn) {
        return;
    }
    if(collinsEnabled()) {
        loadDefineFromShanbay(WordsBook[word]);
    }
}

// 判断柯林斯辞典是否过期
function collinsEnabled() {
    return visible($('a.defn-trigger.collins.sblink'));
}

// 加载百度翻译中的柯林斯辞典
function loadDefineFromBaiduDict(word) {
}

// 加载单词解释
function loadDefineFromShanbay(word) {
    $.getJSON(shanbayAPI.wordDefines + word.contentId, {_:new Date().getTime()}, function(result){
        if(!result.data || !result.data.definitions) {
            console.log('faided to load definitions');
            return;
        }
        word.definitions = result.data.definitions;
        setCollinsSenseId(word, 1);
    })
    .fail(function(){
        console.log('failed to load definitions');
    });
}

// 加载默认例句，需要先设置sense_id，再加载例句
function setCollinsSenseId(word, index) {
    var definitions = word.definitions;
    if(!definitions || definitions.length === 0 || definitions.length < index) {
        loadCollinsView(word);
        return;
    }
    $.ajax({
        url: shanbayAPI.wordDefines + word.contentId + '?sense_id=' + index,
        data: word.definitions[index - 1],
        method: 'PUT'
    })
    .done(function(result){
        if(!result.data || result.data.length === 0 || result.status_code !== 0) {
            console.log('faided to load new examples');
        }
        if(result.status_code === 0) {
            loadSysExamplesFromShanbay(word, index);
        }
    })
    .fail(function(){
        console.log('set sense_id failed:' + word.contentId + '-' + index);
    });
}

function loadCollinsView(word) {
    var reviewDefinitions = $('#review-definitions');
    if(!reviewDefinitions || !reviewDefinitions[0]) {
        return;
    }
    reviewDefinitions.empty();
    var html = _.reduce(word.definitions, function(html, definition, index) {
        return html + '<span class="definition-index pull-left">' + (index+1) + '. </span><li class="definition-group-item">' + (definition.endf || definition.cndf) + '<ul class="example">' + getExamplesHtml(definition.examples) + '</ul></li>';
    }, '<ul class="definition">');
    html += '</ul>';
    reviewDefinitions.html(html);
    console.log(word);

    function getExamplesHtml(examples) {
        return _.reduce(examples, function(html, example){
            return html + '<li class="example-group-item"><p class="annotation">' + example.annotation + '</p><span class="translation">' + example.translation + '</span></li>';
        }, '');
    }
}

function loadSysExamplesFromShanbay(word, index) {
    $.getJSON(shanbayAPI.wordExample + word.reviewId, {_:new Date().getTime()}, function(result){
        if(!result.data || result.data.length === 0 || result.status_code !== 0) {
            console.log('faided to load new examples');
        }
        if(result.status_code === 0) {
            word.definitions[index-1].examples = result.data;
        }
        setCollinsSenseId(word, index + 1);
    })
    .fail(function(){
        console.log('load examples by review failed:' + index);
    });
}

// 判断节点是否可见
function visible(node) {
    return $(node).is(':visible');
}

function loadWordList(callback) {
    var nextLen = len + step;
    $.getJSON(shanbayAPI.wordsList, {len: nextLen,updateType: 'refresh',_:new Date().getTime()}, function(result){
        if(!result.data || result.data.length === 0) {
            console.log('faided to load new words');
            return;
        }
        _.map(result.data.reviews, function(review){
            var word = review.content;
            var wordInfo = {};
            wordInfo['contentId'] = review.content_id;
            wordInfo['reviewId'] = review.id;
            WordsBook[word] = wordInfo;
        });
        len = len + step;
        callback();
    })
    .fail(function(){
        console.log('load list failed');
    });
}
