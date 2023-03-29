
function envOrDefault()
{    
    var=$1
    if [[ -z ${!var} ]]; then
        export $var="$2"
    fi
}

envOrDefault DAEMON_description "Akala generated unit file"
envOrDefault DAEMON_doc "https://akala.js.org"
envOrDefault DAEMON_wants ""
envOrDefault DAEMON_user "%i"
envOrDefault DAEMON_restart "on-failure"
envOrDefault DAEMON_successExitCode ""
envOrDefault DAEMON_restartForceExitStatus ""
envOrDefault DAEMON_umask "0002"
envOrDefault DAEMON_wantedBy "multi-user.target"


function notservice(){
    grep -v -e "DAEMON_description" -e "DAEMON_doc" -e "DAEMON_after" -e "DAEMON_wants" -e "DAEMON_wantedBy"
}

function splitonequals(){
    while read arg;
    do
        var=${arg%=*};
        var=${var:7}
        var=$(tr '[:lower:]' '[:upper:]' <<< ${var:0:1})${var:1}
        value="${arg#*=}";

        echo $var="$value"
    done
}


function generate()
{
    echo '[Unit]'

    [[ ! -z "$DAEMON_description" ]] && echo "Description=$DAEMON_description"
    [[ ! -z "$DAEMON_doc" ]] && echo "Documentation=$DAEMON_doc"
    [[ ! -z "$DAEMON_after" ]] && echo "After=$DAEMON_after"
    [[ ! -z "$DAEMON_wants" ]] && echo "Wants=$DAEMON_wants"
    echo ""
    echo "[Service]"
    echo "ExecStart='$1'"
    env | grep DAEMON_ | notservice | splitonequals
    echo ""
    echo "[Install]"
    [[ ! -z "$DAEMON_wantedBy" ]] && echo "WantedBy=$DAEMON_wantedBy"
}

generate $2 /etc/systemd/system/$DAEMON_wantedBy.wants/$1.service