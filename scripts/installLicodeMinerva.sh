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

echo [minerva/licode] copying log config files
cp $PATHNAME/minerva/nuve_log4js_configuration.json $ROOT/nuve/log4js_configuration.json
cp $PATHNAME/minerva/ec_log4js_configuration.json $ROOT/erizo_controller/log4js_configuration.json
cp $PATHNAME/minerva/erizo_log4cxx.properties $ROOT/erizo_controller/erizoAgent/log4cxx.properties

copy_config(){

  dbURL=`grep "config.nuve.dataBaseURL" $PATHNAME/licode_config_minerva.js`

  dbURL=`echo $dbURL| cut -d'"' -f 2`
  dbURL=`echo $dbURL| cut -d'"' -f 1`

  SERVID=`mongo $dbURL --quiet --eval "db.services.findOne()._id"`
  SERVKEY=`mongo $dbURL --quiet --eval "db.services.findOne().key"`

  SERVID=`echo $SERVID| cut -d'"' -f 2`
  SERVID=`echo $SERVID| cut -d'"' -f 1`

  replacement=s/_auto_generated_ID_/${SERVID}/
  sed $replacement $PATHNAME/licode_config_minerva.js > $BUILD_DIR/licode_1.js
  replacement=s/_auto_generated_KEY_/${SERVKEY}/
  sed $replacement $BUILD_DIR/licode_1.js > $ROOT/licode_config.js
  rm $BUILD_DIR/licode_1.js

  # This could be more secure, but it works!  The seminar app needs this service ID/KEY, so put them in a place it can pull of https.
  echo "{ \"SUPERSERVICE_ID\": \"$SERVID\", \"SUPERSERVICE_KEY\": \"$SERVKEY\" }" > $PATHNAME/../extras/basic_example/public/nuveServiceConfig.py
  cat $PATHNAME/../extras/basic_example/public/nuveServiceConfig.py > $PATHNAME/../extras/basic_example/public/nuveServiceConfig.json

}

echo [minerva/licode] copying general config files
copy_config
