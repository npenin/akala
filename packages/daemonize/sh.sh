


echo '
[Unit]
Description=Syncthing - Open Source Continuous File Synchronization for %I
Documentation=man:syncthing(1)
After=network.target
Wants=syncthing-inotify@.service
 
[Service]
User=%i
ExecStart='$2'
Restart=on-failure
SuccessExitStatus=3 4
RestartForceExitStatus=3 4
UMask=0002
 
[Install]
WantedBy=multi-user.target
' > $1.service