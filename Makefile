php: stunnel.pem
	@php -S localhost:1337 index.php & sudo stunnel3 -d 443 -r 1337 -p ./stunnel.pem -f

stunnel.pem:
	@openssl req -new -x509 -days 365 -nodes -out stunnel.pem -keyout stunnel.pem

test:
	@mocha-headless

test-cov:
	@mocha-headless --coverage

.PHONY: test test-cov
