
function envOrDefault()
{
    if [[ -z "$1" ]]; then
        $1="$2"
    fi
}

envOrDefault DAEMON_description "Akala generated unit file"
envOrDefault DAEMON_doc "https://akala.js.org"
envOrDefault DAEMON_after "network.target"
envOrDefault DAEMON_wants ""
envOrDefault DAEMON_user "%i"
envOrDefault DAEMON_restart "on-failure"
envOrDefault DAEMON_successExitCode ""
envOrDefault DAEMON_restartForceExitStatus ""
envOrDefault DAEMON_umask "0002"
envOrDefault DAEMON_wantedBy "multi-user.target"

function generate()
{
    name=$1;
    shift;
    echo "#!/bin/sh"
    
    echo "node $@"
}

generate $@ #> /etc/init.d/$1