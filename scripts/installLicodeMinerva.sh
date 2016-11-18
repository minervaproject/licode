#!/bin/bash

set -e

SCRIPT=`pwd`/$0
FILENAME=`basename $SCRIPT`
PATHNAME=`dirname $SCRIPT`
ROOT=$PATHNAME/..
BUILD_DIR=$ROOT/build
CURRENT_DIR=`pwd`
DB_DIR="$BUILD_DIR"/db
EXTRAS=$ROOT/extras

echo [minerva/licode] copying nuve.js and erizo.js to basic_example

cd $EXTRAS/basic_example

cp -r $ROOT/erizo_controller/erizoClient/dist/erizo.js $EXTRAS/basic_example/public/
cp -r $ROOT/nuve/nuveClient/dist/nuve.js $EXTRAS/basic_example/

cd $CURRENT_DIR

echo [minerva/licode] installing newrelic for nuve

cd $ROOT/nuve
npm install --loglevel error newrelic
cd $CURRENT_DIR

echo [minerva/licode] applying nuve patch

cd $ROOT
patch -t -p0 < $PATHNAME/minerva_nuve.patch0
cd $CURRENT_DIR

echo [minerva/licode] copying media config file
cp $PATHNAME/rtp_media_config_minerva.js $ROOT/rtp_media_config.js
