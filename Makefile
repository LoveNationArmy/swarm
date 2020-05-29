SHELL=/bin/bash

.EXPORT_ALL_VARIABLES:
HOST?=localhost
PORT?=1337
ORIGIN=http://$(HOST):$(PORT)
TEST?=

%:
	@:

args = `arg="$(filter-out $@,$(MAKECMDGOALS))" && echo $${arg:-${1}}`

test:
	@make php & mocha-headless $(call args) && killall php

mocha:
	@mocha-headless $(call args)

coverage:
	@make test -- --coverage

# HOST=0.0.0.0 PORT=80 make php
php:
	@killall php || true
	@PHP_CLI_SERVER_WORKERS=100 php -S ${HOST}:${PORT} index.php > /dev/null 2>&1

.PHONY: test mocha coverage php
