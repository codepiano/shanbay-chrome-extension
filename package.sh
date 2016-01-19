#!/bin/bash
cd .. && zip -r shanbay.zip shanbay --exclude \*.git\* \*install.jpg \*intro.jpg \*.gitignore\* \*.zip\* \*.DS_Store\* \*package.sh\* && mv shanbay.zip shanbay
