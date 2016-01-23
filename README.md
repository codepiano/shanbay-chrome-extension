扇贝网功能改造chrome插件
=====

这个插件不能帮你免费获得扇贝提供的扩展服务，所有的插件功能建立在你首先付费购买扇贝网服务的前提下

添加一些功能节省背单词的时间，增强相关的功能

### 效果
![image](https://github.com/codepiano/shanbay-chrome-extension/blob/master/image/intro.jpg)

### 安装方式

#### 市场版本

[chrome webstore](https://chrome.google.com/webstore/detail/%E6%89%87%E8%B4%9D/aanmfalgnenapmgaeaknhahbclkbealk?hl=en-US)

#### dev版本

在 chrome 扩展页面勾选「开发者模式」，加载插件源码目录，在背单词页面即可使用

![image](https://github.com/codepiano/shanbay-chrome-extension/blob/master/image/install.jpg)

插件功能：

1. 加载单词所有的百度翻译柯林斯例句（默认使用）
1. 加载单词所有的扇贝柯林斯例句（速度慢，不建议）
1. 单词添加韦氏词典的链接
1. 添加选项控制是否显示笔记和例句面板
1. 添加图片搜索，当光标不再输入框中时，按下面的快捷键会在新标签打开对应的搜索引擎搜索图片
    * g 在谷歌图片中搜索
    * b 在百度图片中搜索
    * w 在wolframalpha中搜索

本来只打算加载扇贝自己的柯林斯词典，不过由于扇贝的 API 设计不能很好的保证速度，转而使用百度翻译的柯林斯例句。

默认情况下使用百度的柯林斯词典，扇贝自身的只是作为保留功能。

todo:

1. 词根功能增强

有建议可以提 issue
