#!/bin/bash

set -e

SCRIPT=`pwd`/$0
FILENAME=`basename $SCRIPT`
PATHNAME=`dirname $SCRIPT`
ROOT=$PATHNAME/..
BUILD_DIR=$ROOT/build
CURRENT_DIR=`pwd`
DB_DIR="$BUILD_DIR"/db

install_nuve(){
  cd $ROOT/nuve
  ./installNuve.sh
  cd $CURRENT_DIR
}

populate_mongo(){

  if ! pgrep mongod; then
    echo [licode] Starting mongodb
    if [ ! -d "$DB_DIR" ]; then
      mkdir -p "$DB_DIR"/db
    fi
    mongod --repair --dbpath $DB_DIR
    mongod --dbpath $DB_DIR --logpath $BUILD_DIR/mongo.log --fork --smallfiles
    sleep 5
  else
    echo [licode] mongodb already running
  fi

  dbURL=`grep "config.nuve.dataBaseURL" $PATHNAME/licode_default.js`

  dbURL=`echo $dbURL| cut -d'"' -f 2`
  dbURL=`echo $dbURL| cut -d'"' -f 1`

  echo [licode] Creating superservice in $dbURL
  mongo $dbURL --eval "db.services.insert({name: 'superService', key: '$RANDOM', rooms: []})"
  SERVID=`mongo $dbURL --quiet --eval "db.services.findOne()._id"`
  SERVKEY=`mongo $dbURL --quiet --eval "db.services.findOne().key"`

  SERVID=`echo $SERVID| cut -d'"' -f 2`
  SERVID=`echo $SERVID| cut -d'"' -f 1`

  if [ -f "$BUILD_DIR/mongo.log" ]; then
    echo "Mongo Logs: "
    cat $BUILD_DIR/mongo.log
  fi

  echo [licode] SuperService ID $SERVID
  echo [licode] SuperService KEY $SERVKEY
  cd $BUILD_DIR
  replacement=s/_auto_generated_ID_/${SERVID}/
  sed $replacement $PATHNAME/licode_default.js > $BUILD_DIR/licode_1.js
  replacement=s/_auto_generated_KEY_/${SERVKEY}/
  sed $replacement $BUILD_DIR/licode_1.js > $ROOT/licode_config.js
  rm $BUILD_DIR/licode_1.js

  # This could be more secure, but it works!  The seminar app needs this service ID/KEY, so put them in a place it can pull of https.
  echo "{ \"SUPERSERVICE_ID\": \"$SERVID\", \"SUPERSERVICE_KEY\": \"$SERVKEY\" }" > $PATHNAME/../extras/basic_example/public/nuveServiceConfig.py
  cat $PATHNAME/../extras/basic_example/public/nuveServiceConfig.py > $PATHNAME/../extras/basic_example/public/nuveServiceConfig.json

  # Write network-config file
  mkdir -p $ROOT/licode_config;

  if [ ! -f "$ROOT/licode_config/host.js" ]; then
    cp $PATHNAME/host_default.js $ROOT/licode_config/host.js
  fi

}

install_nuve
populate_mongo
