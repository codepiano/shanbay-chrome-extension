var review = $('#review');
var observer = new MutationObserver(reviewContentChange);
var config = {childList: true};

// 添加 DOM 事件监听
observer.observe(review[0], config);
// 扩展原生字符串对象
format.extend(String.prototype, {});
// 添加快捷键
var keyBinding= {
    71: 'google',
    66: 'baidu',
    87: 'wolframalpha'
};

// 扇贝API
var shanbayAPI = {
    wordsList: 'https://www.shanbay.com/api/v1/bdc/review/',
    wordDefines: 'https://www.shanbay.com/api/v1/bdc/vocabulary/definitions/',
    wordExample: 'https://www.shanbay.com/api/v1/bdc/example/sys/',
    collinsPay: 'https://www.shanbay.com/api/v1/market/userapplet/applet/collins/'
};

// 图片模板
var imageSearchUrlTemplate = {
    baidu: 'http://image.baidu.com/search/index?tn=baiduimage&word={0}',
    google: 'http://www.google.com/search?tbm=isch&q={0}',
    wolframalpha :'http://www.wolframalpha.com/input/?i={0}'
};

var options = {
    wordTranslate: true,
    exampleTranslate: true,
    hideNotes: false,
    useBaiduCollins: false,
    googleImage: true,
    wolframalpha: false,
    enableShortcut: true,
    baiduImage: true
};

// 绑定快捷键
restoreOptions(function() {
    $(document).keyup(function(event){
        var activeElement = document.activeElement;
        var nodeName = activeElement.nodeName.toLowerCase();
        if (activeElement.nodeType == 1 && (nodeName == "textarea" || nodeName == "input")) {
            return;
        }
        if (options.enableShortcut && keyBinding.hasOwnProperty(event.which)) {
            var link = $('#' + keyBinding[event.which]);
            if(link[0]) {
                chrome.runtime.sendMessage({'url': link.attr('href')});
            }
        }
    });
});

var len = 0;
var step = 14;
var collinsPayed = true;
// 预加载结果
var preloadResult = null;
// 当前单词
var currentWord;
// 扇贝柯林斯数据对象
var WordsBook = {};
// 判断用户是否购买了柯林斯词典
// collinsEnabledFromShanbay();

function reviewContentChange(mutations) {
    // 判断是否插入了 DOM 节点
    var mutation = _.find(mutations, function (mutation) {
        return mutation.addedNodes.length > 0;
    });
    if (!mutation) {
        return;
    }
    // 预加载
    if(previewProcess()) {
        return;
    }
    // 判断添加的是不是 learning-box 元素，该元素包含单词的详细解释
    var learningBox = _.find(mutation.addedNodes, function (node) {
        return node.id === 'learning-box';
    });
    if (!learningBox || !learningBox.children || learningBox.children.length === 0) {
        return;
    }
    // 找出包含单词详细解释的 div 元素
    var learningDetailContainer = _.find(learningBox.children, function (node) {
        return _.includes(node.classList, 'learning-detail-container');
    });
    if (!learningDetailContainer) {
        return;
    }
    var wordText = getWordNodeText();
    if (!wordText || wordText !== currentWord) {
        return;
    } else {
        currentWord = wordText;
    }
    // 加载插件选项
    restoreOptions(function(){
        if (options.useBaiduCollins) {
            changeView(wordText);
        } else {
            // 加载单词列表
            var word = WordsBook[wordText];
            if (!word) {
                loadWordList(changeView);
            } else {
                changeView(word);
            }
        }
    });

    // 改变页面，加载功能
    function changeView(word) {
        $('a.continue.continue-button').css('top', '400px');
        websterLink();
        imageLink();
        collinsSalad(word);
        if(options.hideNotes) {
            $('#notes-box').remove();
        }
    }

    function previewProcess() {
        // 判断添加的是不是 preview 元素，该元素用作判断单词变化，进行预加载
        var preview = _.find(mutation.addedNodes, function (node) {
            return node.className === 'row';
        });
        if (!preview) {
            return false;
        } else {
            var wordHeadline = $('#preview div.span10.offset1 > h1', preview);
            // 找出包含单词的 h1 元素
            if (!wordHeadline[0]) {
                return false;
            }
            currentWord = wordHeadline.text();
            if(preloadResult && preloadResult.word === currentWord) {
                return true;
            }
            return restoreOptions(function(){
                if (collinsPayed && options.useBaiduCollins) {
                    // 后台加载单词解释
                    chrome.runtime.sendMessage({'wordText': currentWord}, preloadWordDataCallback);
                }
                return true;
            });
        }
    }

    function preloadWordDataCallback(result) {
        if(result !== null && result.word === currentWord) {
            if($('#review-definitions')[0]) {
                loadDefineFromBaiduDict(result.data);
            } else {
                preloadResult = result;
            }
        }
    }
}

// 获取当前页面上显示的单词
function getWordNodeText() {
    // 当前单词
    var wordNode = $('#learning_word h1.content');
    if (!wordNode) {
        return null;
    }
    return $.trim(wordNode.contents().get(0).nodeValue.replace(/·/g, ''));
}

// 添加韦氏词典
function websterLink() {
    var wordNode = $('#learning_word h1.content');
    var word = $.trim(wordNode.contents().get(0).nodeValue);
    var small = wordNode.contents().get(1).outerHTML;
    var websterTemplate = '<a class="webster" target="_blank" href="http://www.merriam-webster.com/dictionary/{0}">{1}<sub class="title">韦氏词典</sub></a>&nbsp;' + small;
    wordNode.html(websterTemplate.format(encodeURIComponent(currentWord), word));
}

// 添加图片搜索链接
function imageLink() {
    var imageDiv = $('#cliparts');
    var imageSearchDiv = '<ul class="image-search">{0}</ul>';
    var listItemTemplate = '<li><a href="{0}" id="{1}" target="_blank">{2}</a></li>';
    var encodeQueryWord = encodeURIComponent(currentWord);
    var listItems = '';
    if(options.googleImage) {
        var googleColorfulWorld = '<span class="g">G<span><span class="lo">o</span><span class="ro">o</span><span class="g">g</span><span class="l">l</span><span class="e">e</span>图片';
        listItems += listItemTemplate.format(imageSearchUrlTemplate.google.format(encodeQueryWord), 'google', googleColorfulWorld);
    }
    if(options.baiduImage) {
        listItems += listItemTemplate.format(imageSearchUrlTemplate.baidu.format(encodeQueryWord), 'baidu', '<span class="baidu">百度图片</span>');
    }
    if(options.wolframalpha) {
        var wolframAlphaColorfulWorld = '<span class="wolfram">Wolfram</span><span class="alpha">Alpha<span>';
        listItems += listItemTemplate.format(imageSearchUrlTemplate.wolframalpha.format(encodeQueryWord),  'wolframalpha', wolframAlphaColorfulWorld);
    }
    imageDiv.append(imageSearchDiv.format(listItems));
}

function collinsSalad(word) {
    if (collinsEnabled()) {
        if (options.useBaiduCollins && preloadResult && preloadResult.word === currentWord) {
            loadDefineFromBaiduDict(preloadResult.data);
        } else {
            loadDefineFromShanbay(word);
        }
    }
}

// 判断柯林斯辞典是否过期
function collinsEnabled() {
    collinsPayed = $('a.defn-trigger.collins.sblink').css('display') === 'inline';
    return collinsPayed;
}

// 从扇贝接口获取柯林斯辞典是否过期
function collinsEnabledFromShanbay() {
    $.getJSON(shanbayAPI.collinsPay, {_: new Date().getTime()}, function (result) {
        if (!result.data || result.status_code !== 0) {
            console.log('faided to load collins pay info');
        }
        window.collinsPayed = (result.data.user_applet.days_remain > 0);
    })
    .fail(function () {
        console.log('faided to load collins pay info');
    });
}

// 加载百度翻译中的柯林斯辞典
function loadDefineFromBaiduDict(result) {
    if (!result.dict_result || !result.dict_result.collins) {
        console.log('load nothing from baidu fanyi');
        return;
    }
    var collins = result.dict_result.collins;
    if(!collins.menus && (!collins.entry || collins.entry.length === 0)) {
        console.log('load nothing from baidu fanyi');
        return;
    }
    // 网速过慢或者页面加载过快
    if (collins.word_name !== currentWord) {
        return;
    }
    var html = '<ul class="menu">';
    if (collins.menus) {
        var menus = _.sortBy(collins.menus, 'item_id');
        html = _.reduce(menus, function (html, menu) {
            var shanbayTemplate = '<li class="menu-group-item"><span class="menu-item">{0.item}</span><span class="menu-trans">{0.tran}</span>' + (menu.usage_note ? '<p class="usage-note">{0.usage_note.note}</p><p class="usage-translation">{0.usage_note.translation}</p>' : '') + '{1}</li>';
            return html + shanbayTemplate.format(menu, getEntrysHtml(menu.entry));
        }, html);
    } else {
        html = getEntrysHtml(collins.entry);
    }
    // 结果可能为空
    if (html !== '<ul class="definition"></ul>') {
        replaceDefaultDefinition(html);
    }
    preloadResult = null;

    function getEntrysHtml(entrys) {
        var boxr = _.find(entrys, function (mean) {
            return mean.type === 'boxr';
        });
        var boxrHtml = '';
        if (boxr) {
            boxrHtml = '<p class="boxr">{boxr_value}</p>'.format(boxr.value[0]);
        }
        entrys = _.chain(entrys).filter(function (mean) {
            return mean.type === 'mean';
        }).sortBy('entry_id').value();
        var entryHtml = _.reduce(entrys, function (html, mean, index) {
            var definition = mean.value[0];
            var exampleHtml = '';
            if (definition.mean_type.length !== 0 && !_.contains(['xrsa'], definition.mean_type[0].info_type)) {
                exampleHtml = getExamplesHtml(definition.mean_type);
            }
            if (!definition.def && !definition.tran && exampleHtml === '') {
                return html;
            }
            var baiduFanyiTemplate = '<span class="definition-index pull-left">{0}. </span><li class="definition-group-item"><span class="posp pull-left">{1}</span>' + (options.wordTranslate ? '<p class="trans">{2.tran}</p>' : '') + '<p class="def">{2.def}</p><ul class="example">{3}</ul></li>';
            return html + baiduFanyiTemplate.format(index + 1, !!definition.posp && _.pluck(definition.posp, 'label').join(', '), definition, exampleHtml);
        }, '<ul class="definition">' + boxrHtml);
        return entryHtml + '</ul>';
    }

    function getExamplesHtml(meanTypes) {
        var example = _.find(meanTypes, function (mean) {
            return mean.type === 'defx';
        });
        var defxHtml = '';
        if (example) {
            defxHtml = '<li class="example-group-item"><p class="trans">{tran}</p><p class="def">{def}</p></li>'.format(example.defx);
        }
        meanTypes = _.chain(meanTypes).filter(function (mean) {
            return _.contains(['example', 'posc'], mean.info_type);
        }).sortBy('info_id').value();
        if (meanTypes.length === 0) {
            return '';
        }
        var html = _.reduce(meanTypes, function (html, meanType) {
            var meanTypeTemplate = '<li class="example-group-item"><p class="def">{def}</p><p class="annotation">{ex}</p>' + (options.exampleTranslate ? '<p class="translation">{tran}</p>' : '') + '</li>';
            var example = meanType.example ? meanType.example[0] : meanType.posc[0].example[0];
            // 高亮例句中的单词
            var highlightedEx = highlightWord(example.ex);
            if(highlightedEx !== null) {
                example.ex = highlightedEx;
            }
            return html + meanTypeTemplate.format(example);
        }, '');
        return html + defxHtml;
    }
}

// 高亮例句中的单词
function highlightWord(example) {
    if(currentWord.indexOf(' ') === -1) {
        // 单词匹配
        var regex = new RegExp('([ .,?!\';]|\\.\\.\\.|^)(' + currentWord + ')([ .,?!\';…]|\\.\\.\\.|\'s)', 'gi');
        if(example.match(regex)) {
            return example.replace(regex, '$1<vocab>$2</vocab>$3');
        }
        // 简单的时态变化
        var regexTense = new RegExp('([ .,?!\';]|\\.\\.\\.|^)(' + currentWord + ')(s|es|ing|ed|d)([ .,?!\';…]|\\.\\.\\.)', 'gi');
        if(example.match(regexTense)) {
            return example.replace(regexTense, '$1<vocab>$2$3</vocab>$4');
        }
        // 处理结尾为e的ing变形
        if(currentWord.charAt(currentWord.length - 1) === 'e') {
            var ingTense = currentWord.slice(0, -1) + 'ing';
            var regexIng = new RegExp('([ .,?!\';]|\\.\\.\\.|^)(' + ingTense + ')([ .,?!\';…]|\\.\\.\\.)', 'gi');
            return example.replace(regexIng, '$1<vocab>$2</vocab>$3');
        }
        // 处理结尾为s的复数变形
        if(currentWord.charAt(currentWord.length - 1) === 'y') {
            var endWithYTense = currentWord.slice(0, -1) + 'ies';
            var regexY = new RegExp('([ .,?!\';]|\\.\\.\\.|^)(' + endWithYTense + ')([ .,?!\';…]|\\.\\.\\.)', 'gi');
            return example.replace(regexY, '$1<vocab>$2</vocab>$3');
        }
    }
    return null;
}

function multiMatch(example) {
    // 短语匹配
    var words = currentWord.split(' ');
    var indices = _.map(words, findAllPosition);
    if(indices && indices.length > 0) {
        var anchorWordIndex = _.findIndex(indices, function(wordPositions){return wordPositions && wordPositions.length === 1;});
        if(anchorWordIndex !== -1) {
            // 确定一个锚点单词
            var anchor = indices[anchorWordIndex][0];
            // 选离锚点最近的单词
            var replacePosition = _.map(indices, function(value, index){
                var firstGreater;
                if(index === anchorWordIndex) {
                    return value[0];
                } else if(index < anchorWordIndex) {
                    firstGreater =  _.findIndex(value, function(position){ return position > anchor;});
                    if(firstGreater < 1) {
                        return -1;
                    }
                    return value[firstGreater - 1];
                } else if(index > anchorWordIndex) {
                    firstGreater =  _.findIndex(value, function(position){ return position > anchor;});
                    if(firstGreater === -1) {
                        return -1;
                    }
                    return value[firstGreater];
                }
            });
            // 出现顺序不一致，返回空
            if(_.any(replacePosition, function(value){return value === -1;})) {
                return null;
            }
            // 倒序切割字符串，不会影响前面的position
            replacePosition.reverse();
            words.reverse();
            return _.reduce(replacePosition, function(sentence, position, index) {
                var wordLength = words[index].length;
                return sentence.slice(0, position) + '<vocab>' + sentence.slice(position, position + wordLength) + '</vocab>' + sentence.slice(position + wordLength);
            }, example);
        }
    }

    function findAllPosition(word) {
        var positions = [];
        var pos = example.indexOf(word);
        while (pos !== -1) {
            positions.push(pos);
            pos = example.indexOf(word, pos + 1);
        }
        return positions;
    }

}

// 加载单词解释
function loadDefineFromShanbay(word) {
    $.getJSON(shanbayAPI.wordDefines + word.contentId, {_: new Date().getTime()}, function (result) {
        if (!result.data || !result.data.definitions) {
            console.log('faided to load definitions');
            return;
        }
        word.definitions = result.data.definitions;
        setCollinsSenseId(word, 1);
    })
    .fail(function () {
        console.log('failed to load definitions');
    });
}

// 加载默认例句，需要先设置sense_id，再加载例句
function setCollinsSenseId(word, index) {
    var definitions = word.definitions;
    if (!definitions || definitions.length === 0 || definitions.length < index) {
        loadCollinsView(word);
        return;
    }
    $.ajax({
        url: shanbayAPI.wordDefines + word.contentId + '?sense_id=' + index,
        data: word.definitions[index - 1],
        method: 'PUT'
    })
    .done(function (result) {
        if (!result.data || result.data.length === 0 || result.status_code !== 0) {
            console.log('faided to load new examples');
        }
        if (result.status_code === 0) {
            loadSysExamplesFromShanbay(word, index);
        }
    })
    .fail(function () {
        console.log('set sense_id failed:' + word.contentId + '-' + index);
    });
}

// 生成扇贝柯林斯html
function loadCollinsView(word) {
    var html = _.reduce(word.definitions, function (html, definition, index) {
        var shanbayTemplate = '<span class="definition-index pull-left">{0}. </span><li class="definition-group-item">{1}<ul class="example">{2}</ul></li>';
        return html + shanbayTemplate.format(index + 1, (definition.endf || definition.cndf), getExamplesHtml(definition.examples));
    }, '<ul class="definition">');
    html += '</ul>';
    replaceDefaultDefinition(html);

    function getExamplesHtml(examples) {
        return _.reduce(examples, function (html, example) {
            var exampleTemplate = '<li class="example-group-item"><p class="annotation">{annotation}</p>' + (options.exampleTranslate ? '<p class="translation">{translation}</p>' : '') + '</li>';
            return html + exampleTemplate.format(example);
        }, '');
    }
}

function loadSysExamplesFromShanbay(word, index) {
    $.getJSON(shanbayAPI.wordExample + word.reviewId, {_: new Date().getTime()}, function (result) {
        if (!result.data || result.data.length === 0 || result.status_code !== 0) {
            console.log('faided to load new examples');
        }
        if (result.status_code === 0) {
            word.definitions[index - 1].examples = result.data;
        }
        setCollinsSenseId(word, index + 1);
    })
    .fail(function () {
        console.log('load examples by review failed:' + index);
    });
}

// 判断节点是否可见
function visible(node) {
    return $(node).is(':visible');
}

function loadWordList(callback) {
    var nextLen = len + step;
    $.getJSON(shanbayAPI.wordsList, {len: nextLen, updateType: 'refresh', _: new Date().getTime()}, function (result) {
        if (!result.data || result.data.length === 0) {
            console.log('faided to load new words');
            return;
        }
        _.map(result.data.reviews, function (review) {
            var word = review.content;
            var wordInfo = {};
            wordInfo.contentId = review.content_id;
            wordInfo.reviewId = review.id;
            wordInfo.word = word;
            WordsBook[word] = wordInfo;
        });
        len = len + step;
        var word = WordsBook[currentWord];
        if (!word) {
            console.log('load word list error, not match' + currentWord);
        }
        var wordText = getWordNodeText();
        if (!wordText || wordText === currentWord) {
            callback(word);
        } else {
            console.log('load word list finish, but page changed');
        }
    })
    .fail(function () {
        console.log('load word list failed');
    });
}

function replaceDefaultDefinition(html) {
    var reviewDefinitions = $('#review-definitions');
    if (!reviewDefinitions || !reviewDefinitions[0]) {
        return;
    }
    reviewDefinitions.html(html);
    $('#learning-examples-box').remove();
}

function restoreOptions(callback) {
    chrome.storage.sync.get({
        wordTranslate: true,
        exampleTranslate: true,
        hideNotes: false,
        useBaiduCollins: false,
        googleImage: true,
        wolframalpha: false,
        enableShortcut: true,
        baiduImage: true
    }, function (items) {
        options = items;
        return callback();
    });
}
