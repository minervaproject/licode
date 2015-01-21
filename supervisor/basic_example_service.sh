#!/bin/bash

# Script designed to run from a process control like supervisor or upstart
# Does not put process in the background.

pushd `dirname $0` > /dev/null
ROOT=`pwd`/..
popd > /dev/null

EXTRAS=$ROOT/extras

cd $EXTRAS/basic_example
node basicServer.js