#!/bin/bash
runcmake() {
   cmake ../src
   echo "Done"
}
BIN_DIR="build"
if [ -d $BIN_DIR ]; then
  cd $BIN_DIR
  make VERBOSE=1
else
  echo "Error, build directory does not exist, run generateProject.sh first"
fi

