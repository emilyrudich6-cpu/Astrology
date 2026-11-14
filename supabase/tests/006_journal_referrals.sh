# Database checks for 006, run against a throwaway local Postgres (never production):
#   createdb vp; psql -d vp -f supabase/tests/stub.sql; then schema.sql, 002-006; then: bash supabase/tests/006_journal_referrals.sh
P="psql -h /tmp/pg -p 5499 -U postgres -d vp -v ON_ERROR_STOP=1 -qtA"
Q="psql -h /tmp/pg -p 5499 -U postgres -d vp -qtA"
pass=0; fail=0
check() { if [ "$2" == "$3" ]; then echo "ok   $1"; pass=$((pass+1)); else echo "FAIL $1: got '$2' want '$3'"; fail=$((fail+1)); fi; }
mkuser() { $P -c "insert into auth.users (id,email,email_confirmed_at) values ('$1','$1@x.test',now()); insert into profiles (id,email,name,birth_date,birth_time,latitude,longitude,timezone,birth_place) values ('$1','$1@x.test','$2','1995-10-06','10:00',34.05,-118.24,'America/Los_Angeles','LA');" ; }
mkbare() { $P -c "insert into auth.users (id,email,email_confirmed_at) values ('$1','$1@x.test',now()); insert into profiles (id,email,name) values ('$1','$1@x.test','$2');" ; }
add() { $Q -c "select add_journal_entry('$1', $2, '12:12', '1212', now(), current_date, '12:12', 'America/Los_Angeles', 'note', current_date)" >/dev/null 2>&1 && echo ok || echo err; }
A=aaaaaaaa-0000-0000-0000-000000000001; B=bbbbbbbb-0000-0000-0000-000000000002; C=cccccccc-0000-0000-0000-000000000003
mkuser $A Ana; mkuser $B Bea; mkuser $C Cy
# --- journal cap
for i in 1 2 3 4 5; do add $A 5 >/dev/null; done
check "6th entry blocked at cap 5" "$(add $A 5)" "err"
check "A has 5 entries" "$($P -c "select count(*) from journal_entries where user_id='$A'")" "5"
err=$($Q -c "select add_journal_entry('$A', 5, '1','1', now(), current_date, null, 'UTC', null, current_date)" 2>&1 | grep -o journal_cap_reached)
check "cap error code" "$err" "journal_cap_reached"
# --- 12 simultaneous saves, cap 5
for i in $(seq 1 12); do add $B 5 > /tmp/dbtest/b$i & done; wait
check "simultaneous saves stop at 5" "$($P -c "select count(*) from journal_entries where user_id='$B'")" "5"
# --- unlimited (Deep Dive with Phase 2 on)
for i in 1 2 3 4 5 6 7; do add $C null >/dev/null; done
check "unlimited cap" "$($P -c "select count(*) from journal_entries where user_id='$C'")" "7"
check "activity has no text, one row per day" "$($P -c "select count(*) from journal_activity where user_id='$C'")" "1"
# --- privacy with Supabase-style grants
$P -c "grant usage on schema public to authenticated, anon; grant select, insert, update, delete on all tables in schema public to authenticated, anon;"
own=$($Q -c "set role authenticated; select set_config('request.jwt.claim.sub','$A',false); select count(*) from journal_entries;" | tail -1)
check "member sees only own entries" "$own" "5"
anon=$($Q -c "set role anon; select count(*) from journal_entries;" | tail -1)
check "signed-out sees none" "$anon" "0"
ins=$($Q -c "set role authenticated; select set_config('request.jwt.claim.sub','$A',false); insert into journal_entries (user_id,number_raw,number_norm,seen_at,seen_local_date,seen_tz) values ('$A','1','1',now(),current_date,'UTC');" 2>&1 | grep -c "row-level security")
check "members can't insert directly (cap can't be bypassed)" "$ins" "1"
fn=$($Q -c "set role authenticated; select add_journal_entry('$A', null, '1','1', now(), current_date, null, 'UTC', null, current_date)" 2>&1 | grep -c "permission denied")
check "members can't call the save function" "$fn" "1"
# --- referrals
I=11111111-0000-0000-0000-000000000001
mkuser $I Inviter; $P -c "update profiles set invite_code='VPTEST01' where id='$I'"
F1=f1f1f1f1-0000-0000-0000-000000000001; F2=f2f2f2f2-0000-0000-0000-000000000002; F3=f3f3f3f3-0000-0000-0000-000000000003
for f in $F1 $F2 $F3; do $P -c "insert into auth.users (id,email,email_confirmed_at) values ('$f','$f@x.test',now())"; done
check "self-referral blocked" "$($P -c "select attach_referral('$I','VPTEST01')")" "f"
check "unknown code ignored" "$($P -c "select attach_referral('$F1','NOPE')")" "f"
check "friend 1 attached" "$($P -c "select attach_referral('$F1','vptest01 ')")" "t"
check "same friend can't be attached twice" "$($P -c "select attach_referral('$F1','VPTEST01')")" "f"
check "friend 2 attached" "$($P -c "select attach_referral('$F2','VPTEST01')")" "t"
# friend 3 already has a chart before using the link
$P -c "insert into profiles (id,email,name,birth_date,latitude,longitude,timezone) values ('$F3','f3@x.test','Old','1990-01-01',0,0,'UTC'); insert into readings (user_id,kind,deliver_at) values ('$F3','natal',now())"
check "existing chart owner can't be referred" "$($P -c "select attach_referral('$F3','VPTEST01')")" "f"
check "status pending before chart" "$($P -c "select status||'/'||rewarded from referrals where friend_id='$F1'")" "signed_up/false"
check "redeem before credit fails" "$($Q -c "select * from redeem_referral('$I')" 2>&1 | grep -o no_credit)" "no_credit"
# friends create their charts
for f in $F1 $F2; do $P -c "insert into profiles (id,email,name,birth_date,birth_time,latitude,longitude,timezone,birth_place) values ('$f','$f@x.test','Friend-$f','1993-04-17','21:15',45.5,-122.6,'America/Los_Angeles','Portland')"; done
check "friend 1 qualifies and earns the reward" "$($P -c "select qualify_referral('$F1')")" "rewarded"
check "qualifying again changes nothing" "$($P -c "select qualify_referral('$F1')")" "already"
check "friend 2 qualifies without a second reward" "$($P -c "select qualify_referral('$F2')")" "qualified"
check "one reward per inviter" "$($P -c "select count(*) from referrals where inviter_id='$I' and rewarded")" "1"
check "redeem before friend shares fails" "$($Q -c "select * from redeem_referral('$I')" 2>&1 | grep -o not_shared)" "not_shared"
check "friend 1 declines" "$($P -c "select set_referral_share('$F1', false)")" "declined"
check "reward passes to friend 2" "$($P -c "select rewarded from referrals where friend_id='$F2'")" "t"
check "friend 2 shares" "$($P -c "select set_referral_share('$F2', true)")" "shared"
# 6 simultaneous redemptions
for i in 1 2 3 4 5 6; do $Q -c "select out_outcome from redeem_referral('$I')" > /tmp/dbtest/r$i & done; wait
check "simultaneous redemptions start one reading" "$(cat /tmp/dbtest/r? | sort | uniq -c | awk '{print $2"="$1}' | tr '\n' ' ')" "existing=5 started=1 "
check "exactly one synastry reading, marked paid" "$($P -c "select count(*)||'/'||case when bool_and(paid) then 't' else 'f' end from readings where user_id='$I' and kind='synastry'")" "1/t"
check "friend saved as purchased (not counted in Your People)" "$($P -c "select count(*) from people where user_id='$I' and purchased")" "1"
RID=$($P -c "select reading_id from referrals where friend_id='$F2'")
$P -c "update readings set status='failed', attempts=3 where id='$RID'"
check "failed reading is retried, not duplicated" "$($P -c "select out_reading_id||'/'||out_outcome from redeem_referral('$I')")" "$RID/retry"
check "still one reading after retry" "$($P -c "select count(*)||'/'||max(status)||'/'||max(attempts) from readings where user_id='$I' and kind='synastry'")" "1/scheduled/0"
check "sharing after redemption is locked" "$($P -c "select set_referral_share('$F2', false)")" "redeemed"
# concurrency: 5 friends of a new inviter qualify at once
J=22222222-0000-0000-0000-000000000002; mkuser $J Jo; $P -c "update profiles set invite_code='VPTEST02' where id='$J'"
for k in 1 2 3 4 5; do g=9999999$k-0000-0000-0000-00000000000$k; $P -c "insert into auth.users (id,email,email_confirmed_at) values ('$g','g$k@x.test',now()); insert into profiles (id,email,name,birth_date,latitude,longitude,timezone) values ('$g','g$k@x.test','G$k','1990-01-01',0,0,'UTC')"; $P -c "select attach_referral('$g','VPTEST02')" >/dev/null; done
for k in 1 2 3 4 5; do g=9999999$k-0000-0000-0000-00000000000$k; $Q -c "select qualify_referral('$g')" >/dev/null & done; wait
check "simultaneous qualifications give one reward" "$($P -c "select count(*) from referrals where inviter_id='$J' and rewarded")" "1"
check "members can't call referral functions" "$($Q -c "set role authenticated; select qualify_referral('$F1')" 2>&1 | grep -c "permission denied")" "1"
echo "passed $pass, failed $fail"
