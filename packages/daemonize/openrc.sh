
function envOrDefault()
{
    if [[ -z "$1" ]]; then
        $1="$2"
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
    grep -e "DAEMON_depend_need" -e "DAEMON_depend_use" -e "DAEMON_depend_want" -e "DAEMON_depend_before" -e "DAEMON_depend_after" -e "DAEMON_depend_provide" -e "DAEMON_depend_keyword" 
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
    echo '#!/sbin/openrc-run'
    
    if [[ ! -z "$DAEMON_depend_need" ]] || \
        [[ ! -z "$DAEMON_depend_use" ]] || \
        [[ ! -z "$DAEMON_depend_want" ]] || \
        [[ ! -z "$DAEMON_depend_before" ]] || \
        [[ ! -z "$DAEMON_depend_after" ]] || \
        [[ ! -z "$DAEMON_depend_provide" ]] || \
        [[ ! -z "$DAEMON_depend_keyword" ]]; then
        echo "depend() {"
        [[ ! -z "$DAEMON_depend_need" ]] && echo need $DAEMON_depend_need
        [[ ! -z "$DAEMON_depend_use" ]] && echo use $DAEMON_depend_use
        [[ ! -z "$DAEMON_depend_want" ]] && echo want $DAEMON_depend_want
        [[ ! -z "$DAEMON_depend_before" ]] && echo before $DAEMON_depend_before
        [[ ! -z "$DAEMON_depend_after" ]] && echo after $DAEMON_depend_after
        [[ ! -z "$DAEMON_depend_provide" ]] && echo provide $DAEMON_depend_provide
        [[ ! -z "$DAEMON_depend_keyword" ]] && echo keyword $DAEMON_depend_keyword
        echo "}"
        echo ""
    fi

    env | grep DAEMON_ | notservice | splitonequals

}

generate $2 # > /etc/init.d/$1