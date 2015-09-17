#!/bin/bash

# Script designed to run from a process control like supervisor or upstart
# Does not put process in the background.

pushd `dirname $0` > /dev/null
ROOT=`pwd`/..
popd > /dev/null

export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$ROOT/erizo/build/erizo:$ROOT/erizo:$ROOT/build/libdeps/build/lib
export ERIZO_HOME=$ROOT/erizo/

# Make sure nuve service has started
sleep 5

cd $ROOT/erizo_controller/erizoController

ulimit -n 4096
ulimit -c unlimited

# if you run into c++ seg faults, use this instead of the while block in dev (type run at gdb prompt)
# gdb --args node erizoController.js

# let supervisor manage process restarts
# while node erizoController.js; do
#   echo "node erizoController.js exited unexpectedly.  Respawning." >&2
#   until node erizoController.js; do
#       echo "node erizoController.js crashed with exit code $?.  Respawning." >&2
#       sleep 1
#   done
# done

sudo supervisorctl status nuve | grep RUNNING > /dev/null
nuve_status=$?
if [ $nuve_status -ne 0 ]; then
  >&2 echo "Nuve not running, exiting"
  exit 1
fi


node erizoController.js