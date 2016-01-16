#!/bin/bash
cd .. && zip -r shanbay.zip shanbay --exclude \*.git\* \*.gitignore\* \*.zip\* \*.DS_Store\* \*package.sh\* && mv shanbay.zip shanbay
