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

cd $ROOT/erizo_controller/erizoAgent

ulimit -n 4096
ulimit -c unlimited

# let supervisor manage process restarts
# while node erizoAgent.js; do
#   echo "node erizoAgent.js exited unexpectedly.  Respawning." >&2
#   until node erizoAgent.js; do
#       echo "node erizoAgent.js crashed with exit code $?.  Respawning." >&2
#       sleep 1
#   done
# done

node erizoAgent.js