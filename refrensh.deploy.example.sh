# Local:
# https://stackoverflow.com/questions/21151178/shell-script-to-check-if-specified-git-branch-exists
# test if the branch is in the local repository.
# return 1 if the branch exists in the local, or 0 if not.
function is_in_local() {
    local branch=${1}
    local existed_in_local=$(git branch --list ${branch})

    if [[ -z ${existed_in_local} ]]; then
        echo 0
    else
        echo 1
    fi
}

# Remote:
# Ref: https://stackoverflow.com/questions/8223906/how-to-check-if-remote-branch-exists-on-a-given-remote-repository
# test if the branch is in the remote repository.
# return 1 if its remote branch exists, or 0 if not.
function is_in_remote() {
    local branch=${1}
    local existed_in_remote=$(git ls-remote --heads origin ${branch})

    if [[ -z ${existed_in_remote} ]]; then
        echo 0
    else
        echo 1
    fi
}

branch_name="${1}";
pid=prod-meta-polkadot;

if [ -z "$1" ]; then
  git pull && yarn && pm2 restart $pid;
  echo 'no branch given';
else
  is_local=$(is_in_local $branch_name);
  if [ "$is_local" = 1 ]; then
    git checkout $branch_name && git pull && yarn && pm2 restart $pid;
    echo "local branch ${1}";
  else
    is_remote=$(is_in_remote $branch_name);
    if [ "$is_remote" = 1 ]; then
      git pull && git checkout -t origin/$branch_name && yarn && pm2 restart $pid;
      echo "remote branch ${1}";
    fi
  fi
fi
