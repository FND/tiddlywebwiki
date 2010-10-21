.PHONY: all tiddlywiki remotes jslib clean test dist release pypi peermore makebundle uploadbundle bundle

wrap_jslib = curl -s $(2) | \
	{ \
		echo "/***"; echo $(2); echo "***/"; \
		echo "//{{{"; cat -; echo "//}}}"; \
	} > $(1)

all:
	@echo "No target"

tiddlywiki:
	mkdir tiddlywebwiki/resources || true
	wget http://tiddlywiki.com/empty.html -O tiddlywebwiki/resources/empty.html

remotes: jslib tiddlywiki
	./cacher

jslib:
	$(call wrap_jslib, src/chrjs.js, \
		http://github.com/tiddlyweb/chrjs/raw/master/main.js)
	$(call wrap_jslib, src/jquery-json.js, \
		http://jquery-json.googlecode.com/files/jquery.json-2.2.min.js

clean:
	find . -name "*.pyc" |xargs rm || true
	rm -r dist || true
	rm -r build || true
	rm -r tiddlywebwiki.egg-info || true
	rm *.bundle || true
	rm -r tiddlywebwiki/resources || true
	rm -r store tiddlyweb.log || true

test: remotes
	py.test -x test

dist: test
	python setup.py sdist

release: clean remotes test pypi peermore

pypi:
	python setup.py sdist upload

peermore:
	scp -P 8022 dist/tiddlywebwiki-*.gz cdent@tiddlyweb.peermore.com:public_html/tiddlyweb.peermore.com/dist
	scp -P 8022 CHANGES cdent@tiddlyweb.peermore.com:public_html/tiddlyweb.peermore.com/dist/CHANGES.tiddlywebwiki

makebundle: clean dist
	pip bundle tiddlywebwiki-`python setup.py --version`.bundle tiddlywebwiki

uploadbundle:
	scp -P 8022 *.bundle cdent@heavy.peermore.com:public_html/tiddlyweb.peermore.com/dist

bundle: clean dist makebundle uploadbundle
