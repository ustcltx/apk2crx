#!/bin/sh

for crx in $(find $1 -type f -name "*.crx");do
	if [ -n "$crx" ];then
	TEMP_DIR=`mktemp -d`
	unzip -o -j $crx "vendor/chromium/crx/*.apk" -d $TEMP_DIR >/dev/null 2>&1
	FNAME=`basename $crx`
	cp $TEMP_DIR/*.apk $1/${FNAME%.crx}.apk
	touch -r $crx $1/${FNAME%.crx}.apk
	rm $TEMP_DIR -r
	fi
done