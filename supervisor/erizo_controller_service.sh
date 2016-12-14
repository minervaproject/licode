#!/bin/bash

# Script designed to run from a process control like supervisor or upstart
# Does not put process in the background.

pushd `dirname $0` > /dev/null
ROOT=`pwd`/..
popd > /dev/null

export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$ROOT/erizo/build/erizo:$ROOT/erizo:$ROOT/build/libdeps/build/lib
export ERIZO_HOME=$ROOT/erizo/

cd $ROOT/erizo_controller/erizoController

ulimit -n 4096
ulimit -c unlimited

# Make sure nuve service has started
sleep 5

sudo supervisorctl status nuve | grep RUNNING > /dev/null
nuve_status=$?
if [ $nuve_status -ne 0 ]; then
  >&2 echo "Nuve not running, exiting"
  exit 1
fi


node erizoController.js