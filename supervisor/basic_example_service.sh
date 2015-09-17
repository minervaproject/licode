#!/bin/bash

# Script designed to run from a process control like supervisor or upstart
# Does not put process in the background.

pushd `dirname $0` > /dev/null
ROOT=`pwd`/..
popd > /dev/null

EXTRAS=$ROOT/extras

sudo supervisorctl status nuve | grep RUNNING > /dev/null
nuve_status=$?
if [ $nuve_status -ne 0 ]; then
  echo "status was $nuve_status"
  >&2 echo "Nuve not running, exiting"
  exit 1
fi

cd $EXTRAS/basic_example
node basicServer.js