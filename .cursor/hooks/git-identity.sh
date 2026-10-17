#!/usr/bin/env bash
# managed-by: git-identity.sh
set -u

readonly PERSONAL_NAME='Travis Glass'
readonly PERSONAL_EMAIL='tarvy@protonmail.com'
readonly PERSONAL_GITHUB_LOGIN='tarvy'
readonly WORK_GITHUB_ORG='devclarityai'
readonly WORK_EMAIL_DOMAIN='devclarity.ai'
# Cursor's co-author hook appends the work address unless this line already exists.
readonly AGENT_COAUTHOR='Cursor Agent <cursoragent@cursor.com>'

readonly OWNERSHIP_MARKER='# managed-by: git-identity.sh'
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
readonly SELF

emit() {
	local perm=$1
	local msg=${2-}
	PERM=$perm MSG=$msg python3 -c 'import json, os
perm = os.environ["PERM"]
msg = os.environ.get("MSG", "")
out = {"permission": perm}
if msg:
    out["user_message"] = msg
    out["agent_message"] = msg
print(json.dumps(out))'
	exit 0
}

url_owner() {
	local url=$1
	local path rest owner
	url=${url%/}
	url=${url%.git}
	case $url in
	*://*)
		rest=${url#*://}
		path=${rest#*/}
		;;
	*:*)
		path=${url#*:}
		;;
	*)
		path=
		;;
	esac
	owner=${path%%/*}
	printf '%s' "$owner" | tr '[:upper:]' '[:lower:]'
}

repo_context() {
	local origin owner
	origin=$(git config --local --get remote.origin.url || true)
	if [ -z "$origin" ]; then
		printf personal
		return
	fi
	owner=$(url_owner "$origin")
	if [ "$owner" = "$WORK_GITHUB_ORG" ]; then
		printf work
		return
	fi
	if [ -z "$owner" ] || [ "$owner" = "$PERSONAL_GITHUB_LOGIN" ]; then
		printf personal
		return
	fi
	printf foreign
}

attaches_work_address() {
	grep -qiF "@$WORK_EMAIL_DOMAIN"
}

ident_email() {
	local ident=$1
	local rest=${ident#*<}
	printf '%s' "${rest%%>*}"
}

commit_msg_main() {
	local msg_file=$1
	local root author committer cemail
	root=$(git rev-parse --show-toplevel)
	cd "$root"
	[ "$(repo_context)" = personal ] || exit 0
	author=$(git var GIT_AUTHOR_IDENT)
	committer=$(git var GIT_COMMITTER_IDENT)
	cemail=$(ident_email "$committer")
	if [ "$cemail" != "$PERSONAL_EMAIL" ]; then
		echo "git-identity: committer must be $PERSONAL_NAME <$PERSONAL_EMAIL> in a personal repo." >&2
		exit 1
	fi
	if {
		printf '%s\n' "$author" "$committer"
		git interpret-trailers --parse "$msg_file"
	} | attaches_work_address; then
		echo "git-identity: this commit attaches a @$WORK_EMAIL_DOMAIN address in a personal repo." >&2
		echo "Remove it from the author, the committer, and the trailers, then commit again." >&2
		exit 1
	fi
	if ! grep -q 'Co-authored-by:' "$msg_file"; then
		git interpret-trailers --in-place --trailer "Co-authored-by: $AGENT_COAUTHOR" "$msg_file" || exit 1
	fi
}

converge_config() {
	local i key want current
	local -a keys=(user.name user.email commit.gpgsign)
	local -a vals=("$PERSONAL_NAME" "$PERSONAL_EMAIL" false)
	for i in 0 1 2; do
		key=${keys[$i]}
		want=${vals[$i]}
		current=$(git config --local --get "$key" || true)
		if [ "$current" = "$want" ]; then
			continue
		fi
		if git config --local "$key" "$want"; then
			continue
		fi
		current=$(git config --local --get "$key" || true)
		if [ "$current" != "$want" ]; then
			printf '%s\n' "$key"
		fi
	done
}

commit_msg_slot() {
	local common hooks_path dir
	common=$(git rev-parse --path-format=absolute --git-common-dir)
	hooks_path=$(git config --get core.hooksPath || true)
	if [ -z "$hooks_path" ]; then
		dir=$common/hooks
	elif [ -r "$hooks_path/.cursor-original-hooks-path" ]; then
		dir=$(cat "$hooks_path/.cursor-original-hooks-path")
	else
		return 2
	fi
	case $dir in
	"$common"/*)
		printf '%s\n' "$dir/commit-msg"
		;;
	*)
		return 1
		;;
	esac
}

converge_commit_msg_hook() {
	local slot status tmp
	slot=$(commit_msg_slot)
	status=$?
	case $status in
	1)
		printf blocked
		return
		;;
	2)
		printf not-needed
		return
		;;
	esac
	if [ -n "$slot" ] && cmp -s "$SELF" "$slot"; then
		printf ours
		return
	fi
	if [ -e "$slot" ] && ! grep -qxF "$OWNERSHIP_MARKER" "$slot"; then
		printf blocked
		return
	fi
	mkdir -p "${slot%/*}"
	tmp=$(mktemp "${slot%/*}/.commit-msg.XXXXXX")
	if cp "$SELF" "$tmp" && chmod 755 "$tmp" && mv -f "$tmp" "$slot"; then
		printf ours
		return
	fi
	rm -f "$tmp"
	printf blocked
}

outgoing_leaks() {
	local log
	git rev-parse --verify HEAD >/dev/null 2>&1 || return 0
	log=$(git log --format='%x1e%h%x09%ae%x09%ce%n%(trailers:only,unfold)' HEAD --not --remotes) || return 1
	printf '%s\n' "$log" | awk -v RS='\x1e' -v pat="@$WORK_EMAIL_DOMAIN" '
		NF && index(tolower($0), tolower(pat)) { print $1 }
	'
}

ensure_main() {
	local input root ctx unconverged slot_state leaks notes scan_status
	input=$(cat || true)
	root=$(git -C "${SELF%/*}" rev-parse --show-toplevel 2>/dev/null) || emit allow
	cd "$root" || emit allow
	ctx=$(repo_context)
	[ "$ctx" = personal ] || emit allow

	notes=
	unconverged=$(converge_config || true)
	if [ -n "$unconverged" ]; then
		notes="git-identity could not set: $(echo "$unconverged" | tr '\n' ' '). Do not commit until a later command converges."
	fi
	slot_state=$(converge_commit_msg_hook || true)

	case $input in
	*git*push*)
		leaks=$(outgoing_leaks)
		scan_status=$?
		if [ "$scan_status" -ne 0 ]; then
			emit deny "git-identity could not scan outgoing commits for @$WORK_EMAIL_DOMAIN, so the push is refused."
		fi
		if [ -n "$leaks" ]; then
			emit deny "git-identity refused the push. Commits $leaks attach a @$WORK_EMAIL_DOMAIN address in a personal repo. Rewrite them first."
		fi
		;;
	esac

	if [ "$slot_state" = blocked ]; then
		case $input in
		*git*commit*)
			notes="${notes} git-identity cannot occupy the commit-msg slot. Add the trailer 'Co-authored-by: $AGENT_COAUTHOR' yourself, or Cursor appends the work address."
			;;
		esac
	fi

	emit allow "$notes"
}

case "$(basename "$0")" in
commit-msg) commit_msg_main "$1" ;;
*) ensure_main ;;
esac
