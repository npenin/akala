#!/bin/sh

cd=
unset=

die() { echo "$*" 1>&2 ; exit 1; }

parseArgs() {
    while [ ! -z $1 ]
    do
        case $1 in
            -u)
                unset $2
                shift;
            ;;
            --unset=*)
                unset ${1#--unset=}
            ;;
            -C)
                cd=$2
                shift;
            ;;--chdir=*)
                cd=${1#--chdir=}
            ;;
            -S)
                shift;
                cli=$*
                break
            ;;
            --split-string=*)
                cli=$cli ${1#--split-string=}
                shift;
                cli=$cli $*;
                break
                ;;
            -*)
                echo $1;
                die 'not supported'
                ;;
            *)
                cli="$cli $*";
                break;
                ;;
        esac
        shift;
    done;
}

parseArgs $*

# echo $cd
# echo $cli
# echo $PATH
if [ -z "$cd" ]
then
    $cli
else
    (cd $cd && $cli)
fi