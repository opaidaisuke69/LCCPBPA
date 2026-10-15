$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8099/api/v1'
$out = @()
try {
  $login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body '{"username":"admin","password":"Admin@123"}'
  $token = $login.data.token
  $out += "login_ok perms=$($login.data.user.permissions.Count) must_change_pw=$($login.data.user.must_change_pw)"
  $me = Invoke-RestMethod -Uri "$base/auth/me" -Method Get -Headers @{ Authorization = "Bearer $token" }
  $out += "me user=$($me.data.username) roles=$($me.data.roles.code -join ',')"
  try { Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body '{"username":"admin","password":"wrong"}' | Out-Null }
  catch { $out += "badlogin_status=$($_.Exception.Response.StatusCode.value__)" }
  try { Invoke-RestMethod -Uri "$base/auth/me" -Method Get | Out-Null }
  catch { $out += "noauth_me_status=$($_.Exception.Response.StatusCode.value__)" }
} catch { $out += "ERR: $($_.Exception.Message)" }
$out -join "`n" | Out-File -Encoding ascii _smoketest.txt
