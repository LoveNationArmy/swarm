SHELL=/bin/bash

.EXPORT_ALL_VARIABLES:
HOST?=localhost
PORT?=1337
ORIGIN=http://$(HOST):$(PORT)

%:
	@:

args = `arg="$(filter-out $@,$(MAKECMDGOALS))" && echo $${arg:-${1}}`

test: clean
	@make php & mocha-headless $(call args) && killall php

mocha:
	@mocha-headless $(call args)

coverage:
	@make test -- --coverage

# HOST=0.0.0.0 PORT=80 make php
php:
	@killall php || true
	@PHP_CLI_SERVER_WORKERS=200 php -S ${HOST}:${PORT} index.php > /dev/null 2>&1

clean:
	@rm -rf signals/offers/*
	@rm -rf signals/answers/*

example:
	@PORT=4334 make php & PORT=4335 live-server --ignorePattern=signals --open=/examples/ .

.PHONY: mocha coverage php clean
