#!/bin/bash

set -e

SCRIPT=`pwd`/$0
FILENAME=`basename $SCRIPT`
PATHNAME=`dirname $SCRIPT`
ROOT=$PATHNAME/..
BUILD_DIR=$ROOT/build
CURRENT_DIR=`pwd`
NVM_CHECK="$PATHNAME"/checkNvm.sh

DB_DIR="$BUILD_DIR"/db
EXTRAS=$ROOT/extras

cd $EXTRAS/basic_example

cp -r ${ROOT}/erizo_controller/erizoClient/dist/assets public/

. $NVM_CHECK

nvm use
npm install --loglevel error express body-parser morgan errorhandler
cd $CURRENT_DIR
