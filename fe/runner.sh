#!/bin/zsh
declare -a simulators=("C1085553-F874-4A60-9A2B-FAAA7C03B2B7" "AC04F69B-6644-4CF4-8052-08D3B194B1C7")
echo "STARTED"
open -a Simulator
wait_time=1
for i in $simulators[@]
do
    echo "Boot $i"
    xcrun simctl boot $i
    sleep $wait_time
    echo "Install Expo $i"
    xcrun simctl install $i ~/.expo/ios-simulator-app-cache/Exponent-2.30.10.tar.app
    sleep $wait_time
    echo "Lauch Expo $i"
    xcrun simctl openurl $i exp://127.0.0.1:19000
    sleep $wait_time
done
echo "FINISHED"