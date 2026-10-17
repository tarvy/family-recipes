#!/usr/bin/env bash
set -eu

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPT=$ROOT/.cursor/hooks/git-identity.sh
DISPATCHER_SRC=/home/ubuntu/.cursor/agent-hooks/L3dvcmtzcGFjZQ
WORK_TRAILER='Co-authored-by: Travis <travis@devclarity.ai>'
PASS=0

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

assert_eq() {
	local label=$1
	local want=$2
	local got=$3
	if [ "$want" != "$got" ]; then
		fail "$label: want [$want] got [$got]"
	fi
	PASS=$((PASS + 1))
}

new_repo() {
	local dir origin=$2
	dir=$(mktemp -d)
	git -C "$dir" init -q
	git -C "$dir" config commit.gpgsign false
	if [ -n "$origin" ]; then
		git -C "$dir" remote add origin "$origin"
	fi
	cp "$SCRIPT" "$dir/git-identity.sh"
	chmod 755 "$dir/git-identity.sh"
	printf '%s' "$dir"
}

run_ensure() {
	local dir=$1
	local command=$2
	(cd "$dir" && printf '%s' "{\"command\":\"$command\"}" | bash ./git-identity.sh)
}

context_email() {
	local dir=$1
	git -C "$dir" config --local --get user.email || true
}

check_origin() {
	local label=$1
	local origin=$2
	local want_email=$3
	local dir
	dir=$(new_repo unused "$origin")
	run_ensure "$dir" "git status" >/dev/null
	assert_eq "$label" "$want_email" "$(context_email "$dir")"
	rm -rf "$dir"
}

check_origin "https tarvy" "https://github.com/tarvy/family-recipes" "tarvy@protonmail.com"
check_origin "token url" "https://x-access-token:TOKEN@github.com/tarvy/family-recipes" "tarvy@protonmail.com"
check_origin "scp" "git@github.com:tarvy/family-recipes.git" "tarvy@protonmail.com"
check_origin "ssh port" "ssh://git@github.com:22/tarvy/family-recipes.git" "tarvy@protonmail.com"
check_origin "missing origin" "" "tarvy@protonmail.com"
check_origin "work org" "https://github.com/devclarityai/widgets.git" ""
check_origin "work org upper" "git@github.com:DevClarityAI/widgets.git" ""
check_origin "ssh alias work" "git@github-work:devclarityai/widgets.git" ""
check_origin "other owner" "https://github.com/other/widgets.git" ""

dir=$(new_repo unused "https://github.com/tarvy/family-recipes.git")
run_ensure "$dir" "git status" >/dev/null
run_ensure "$dir" "git status" >/dev/null
assert_eq "name" "Travis Glass" "$(git -C "$dir" config --local --get user.name)"
assert_eq "signing off" "false" "$(git -C "$dir" config --local --get commit.gpgsign)"
cmp -s "$dir/git-identity.sh" "$dir/.git/hooks/commit-msg" || fail "commit-msg is not a byte copy"
PASS=$((PASS + 1))

printf 'fix the chili\n' >"$dir/msg.txt"
git -C "$dir" -c user.name='Travis Glass' -c user.email='tarvy@protonmail.com' \
	var GIT_COMMITTER_IDENT >/dev/null
(
	cd "$dir"
	GIT_AUTHOR_NAME='Travis Glass'
	GIT_AUTHOR_EMAIL='tarvy@protonmail.com'
	GIT_COMMITTER_NAME='Travis Glass'
	GIT_COMMITTER_EMAIL='tarvy@protonmail.com'
	export GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL
	.git/hooks/commit-msg "$dir/msg.txt"
)
grep -q 'Co-authored-by: Cursor Agent <cursoragent@cursor.com>' "$dir/msg.txt" || fail "missing cursor trailer"
if grep -q 'devclarity.ai' "$dir/msg.txt"; then
	fail "work domain landed in the message"
fi
PASS=$((PASS + 2))

coauthor=/home/ubuntu/.cursor/agent-hooks/L3dvcmtzcGFjZQ/commit-msg.cursor.co-author
"$coauthor" "$dir/msg.txt"
if grep -q 'devclarity.ai' "$dir/msg.txt"; then
	fail "co-author hook appended the work address"
fi
PASS=$((PASS + 1))

printf 'fix the chili\n\nCo-authored-by: Travis <travis@devclarity.ai>\n' >"$dir/msg.txt"
set +e
(
	cd "$dir"
	GIT_AUTHOR_NAME='Travis Glass'
	GIT_AUTHOR_EMAIL='tarvy@protonmail.com'
	GIT_COMMITTER_NAME='Travis Glass'
	GIT_COMMITTER_EMAIL='tarvy@protonmail.com'
	export GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL
	.git/hooks/commit-msg "$dir/msg.txt"
)
status=$?
set -e
assert_eq "refuse work trailer" "1" "$status"

chain=$(mktemp -d)
cp -a "$DISPATCHER_SRC/." "$chain/"
printf '%s\n' "$dir/.git/hooks" >"$chain/.cursor-original-hooks-path"
git -C "$dir" config core.hooksPath "$chain"
echo chili >"$dir/chili.txt"
git -C "$dir" add chili.txt
git -C "$dir" -c user.name='Travis Glass' -c user.email='tarvy@protonmail.com' \
	-c commit.gpgsign=false commit -q -m "fix chili"
msg=$(git -C "$dir" log -1 --format='%an <%ae>%n%B')
printf '%s\n' "$msg" | grep -q 'Travis Glass <tarvy@protonmail.com>' || fail "commit author: $msg"
printf '%s\n' "$msg" | grep -q 'Co-authored-by: Cursor Agent <cursoragent@cursor.com>' || fail "dispatcher trailer: $msg"
if printf '%s\n' "$msg" | grep -q 'devclarity.ai'; then
	fail "dispatcher let the work address through: $msg"
fi
PASS=$((PASS + 3))

deny=$(run_ensure "$dir" "git push origin HEAD")
printf '%s\n' "$deny" | grep -q '"permission": "allow"' || fail "clean push should allow: $deny"
PASS=$((PASS + 1))

rm -rf "$dir" "$chain"

# Cloud order: Cursor's dispatcher is already core.hooksPath before the first command.
cloud=$(new_repo unused "https://github.com/tarvy/family-recipes")
cloud_chain=$(mktemp -d)
cp -a "$DISPATCHER_SRC/." "$cloud_chain/"
printf '%s\n' "$cloud/.git/hooks" >"$cloud_chain/.cursor-original-hooks-path"
git -C "$cloud" config core.hooksPath "$cloud_chain"
run_ensure "$cloud" "git status" >/dev/null
cmp -s "$cloud/git-identity.sh" "$cloud/.git/hooks/commit-msg" || fail "cloud order did not install commit-msg"
echo beans >"$cloud/beans.txt"
git -C "$cloud" add beans.txt
git -C "$cloud" -c commit.gpgsign=false commit -q -m "add beans"
cloud_msg=$(git -C "$cloud" log -1 --format='%an <%ae>%n%B')
printf '%s\n' "$cloud_msg" | grep -q 'Travis Glass <tarvy@protonmail.com>' || fail "cloud author: $cloud_msg"
printf '%s\n' "$cloud_msg" | grep -q 'Co-authored-by: Cursor Agent <cursoragent@cursor.com>' || fail "cloud trailer: $cloud_msg"
if printf '%s\n' "$cloud_msg" | grep -q 'devclarity.ai'; then
	fail "cloud order leaked the work address: $cloud_msg"
fi
PASS=$((PASS + 3))
rm -rf "$cloud" "$cloud_chain"

echo "ok $PASS checks"
