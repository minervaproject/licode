#!/bin/bash

# Script designed to run from a process control like supervisor or upstart
# Does not put process in the background.

pushd `dirname $0` > /dev/null
ROOT=`pwd`/..
popd > /dev/null

NVM_CHECK="$ROOT"/scripts/checkNvm.sh

cd $ROOT/nuve/nuveAPI

. $NVM_CHECK

nvm use
node nuve.js
