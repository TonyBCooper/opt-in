#!/bin/bash
cd "$(dirname "$0")"

xdg-open http://127.0.0.1:8888/test.html
php -S 127.0.0.1:8888
