#!/bin/sh
libPath=$(dirname $0)
$libPath/aapt dump badging $1 | sed "s/\(\w\)'\(\w\)/\1¿\2/g" | sed '$d'
