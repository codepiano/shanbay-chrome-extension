var review = $('#review');
var observer = new MutationObserver(reviewContentChange);
var config = { childList: true };

// 添加 DOM 事件监听
observer.observe(review[0], config);
// 扩展原生字符串对象
format.extend(String.prototype, {});

var len = 0;
var step = 14;
var shanbayAPI = {
    wordsList : 'http://www.shanbay.com/api/v1/bdc/review/',
    wordDefines : 'http://www.shanbay.com/api/v1/bdc/vocabulary/definitions/',
    wordExample: 'http://www.shanbay.com/api/v1/bdc/example/sys/'
};
var baiduAPI = {
    translateV2: 'http://fanyi.baidu.com/v2transapi'
};
var options = {
    wordTranslate: true,
    exampleTranslate: true
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
    var learningDetailContainer = _.find(learningBox.children, function(node){return _.includes(node.classList, 'learning-detail-container');});
    if(!learningDetailContainer) {
        return;
    }
    // 当前单词
    var wordNode = $('#learning_word h1.content');
    if(!wordNode) {
        return;
    }
    var wordText = $.trim(wordNode.contents().get(0).nodeValue);
    if(wordText === current_word) {
        return;
    } else {
        current_word = wordText;
    }
    // 加载插件选项
    restore_options();
    var word = WordsBook[wordText];
    if(!word) {
        // 加载单词列表
        loadWordList(changeView);
    } else {
        // 改变页面
        changeView(word);
    }

    // 改变页面，加载功能
    function changeView(word) {
        websterLink();
        collinsSalad(word);
        $('#notes-box').remove();
    }
}

function websterLink() {
    var wordNode = $('#learning_word h1.content');
    var small = wordNode.contents().get(1).outerHTML;
    var websterTemplate = '<a class="webster" target="_blank" href="http://www.merriam-webster.com/dictionary/{0}">{1}</a>' + small;
    wordNode.html(websterTemplate.format(encodeURIComponent(current_word), current_word));
}

function collinsSalad(word) {
    if(collinsEnabled()) {
        // loadDefineFromShanbay(word);
        loadDefineFromBaiduDict(word);
    }
}

// 判断柯林斯辞典是否过期
function collinsEnabled() {
    return $('a.defn-trigger.collins.sblink').css('display') === 'inline';
}

// 加载百度翻译中的柯林斯辞典
function loadDefineFromBaiduDict(word) {
    var wordText = word.word;
    $.ajax({
        url: baiduAPI.translateV2,
        data: {
            from              : 'en',
            to                : 'zh',
            query             : wordText,
            transtype         : 'realtime',
            simple_means_flag : 3
        },
        method: 'POST'
    })
    .done(function(result){
        if(!result.dict_result || !result.dict_result.collins || result.dict_result.collins.entry.length === 0) {
            console.log('load nothing from baidu fanyi');
            return;
        }
        var collins = result.dict_result.collins;
        // 网速过慢或者页面加载过快
        if(collins.word_name !== current_word) {
            return;
        }
        var html = '<ul class="menu">';
        if(collins.menus) {
            var menus = _.sortBy(collins.menus, 'item_id');
            html = _.reduce(menus, function(html, menu) {
                var shanbayTemplate = '<span class="menu-index pull-left">{0.item_id}. </span><li class="menu-group-item"><span class="item">{0.item}</span><p class="trans">{0.tran}</p><p class="usage-note">{0.usage_note.note}</p><p class="usage-translation">{0.usage_note.translation}</p><ul class="example">{1}</ul></li>';
                return html + shanbayTemplate.format(menu, getEntrysHtml(menu.entry));
            }, html);
        } else {
            html = getEntrysHtml(collins.entry);
        }
        replaceDefaultDefinition(html);

        function getEntrysHtml(entrys) {
            var boxr = _.find(entrys, function(mean){ return mean.type === 'boxr';});
            var boxrHtml = '';
            if(boxr) {
                boxrHtml = '<p class="boxr">{boxr_value}</p>'.format(boxr.value[0]);
            }
            entrys = _.chain(entrys).filter(function(mean){ return mean.type === 'mean';}).sortBy('entry_id').value();
            return _.reduce(entrys, function(html, mean, index) {
                var definition = mean.value[0];
                var exampleHtml = '';
                if(definition.mean_type.length !== 0 && !_.contains(['xrsa'], definition.mean_type[0].info_type)) {
                    exampleHtml = getExamplesHtml(definition.mean_type);
                }
                if(!definition.def && !definition.tran && exampleHtml === '') {
                    return html;
                }
                var baiduFanyiTemplate = '<span class="definition-index pull-left">{0}. </span><li class="definition-group-item"><span class="posp pull-left">{1}</span>' + (options.wordTranslate ? '<p class="trans">{2.tran}</p>' : '') + '<p class="def">{2.def}</p><ul class="example">{3}</ul></li>';
                return html + baiduFanyiTemplate.format(index + 1, !!definition.posp && _.pluck(definition.posp, 'label').join(', '), definition, exampleHtml);
            }, '<ul class="definition">' + boxrHtml);

        }

        function getExamplesHtml(meanTypes) {
            var example = _.find(meanTypes, function(mean){ return mean.type === 'defx';});
            var defxHtml = '';
            if(example) {
                defxHtml = '<li class="example-group-item"><p class="trans">{tran}</p><p class="def">{def}</p></li>'.format(example.defx);
            }
            meanTypes = _.chain(meanTypes).filter(function(mean){ return _.contains(['example', 'posc'], mean.info_type);}).sortBy('info_id').value();
            var html = _.reduce(meanTypes, function(html, meanType){
                var meanTypeTemplate = '<li class="example-group-item"><p class="def">{def}</p><p class="annotation">{ex}</p>' + (options.exampleTranslate ? '<span class="translation">{tran}</span>' : '') + '</li>';
                var example = meanType.example ? meanType.example[0] : meanType.posc[0].example[0];
                return html + meanTypeTemplate.format(example);
            }, '');
            return html + defxHtml;
        }
    })
    .fail(function(){
    });
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
        url    : shanbayAPI.wordDefines + word.contentId + '?sense_id=' + index,
        data   : word.definitions[index - 1],
        method : 'PUT'
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

// 生成扇贝柯林斯html
function loadCollinsView(word) {
    var html = _.reduce(word.definitions, function(html, definition, index) {
        var shanbayTemplate = '<span class="definition-index pull-left">{0}. </span><li class="definition-group-item">{1}<ul class="example">{2}</ul></li>';
        return html + shanbayTemplate.format(index + 1, (definition.endf || definition.cndf), getExamplesHtml(definition.examples));
    }, '<ul class="definition">');
    html += '</ul>';
    replaceDefaultDefinition(html);

    function getExamplesHtml(examples) {
        return _.reduce(examples, function(html, example){
            var exampleTemplate = '<li class="example-group-item"><span class="glyphicon glyphicon-minus" aria-hidden="true"></span><p class="annotation">{annotation}</p>' + (options.exampleTranslate ? '<span class="translation">{translation}</span>' : '') + '</li>';
            return html + exampleTemplate.format(example);
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
            wordInfo.contentId = review.content_id;
            wordInfo.reviewId = review.id;
            wordInfo.word = word;
            WordsBook[word] = wordInfo;
        });
        len = len + step;
        var word = WordsBook[current_word];
        if(!word) {
            console.log('load word list error, not match' + current_word);
        }
        callback(word);
    })
    .fail(function(){
        console.log('load word list failed');
    });
}

function replaceDefaultDefinition(html) {
    var reviewDefinitions = $('#review-definitions');
    if(!reviewDefinitions || !reviewDefinitions[0]) {
        return;
    }
    reviewDefinitions.html(html);
    $('#learning-examples-box').remove();
}

function restore_options() {
    chrome.storage.sync.get({
        wordTranslate: true,
        exampleTranslate: true
    }, function(items) {
        options = items;
    });
}
