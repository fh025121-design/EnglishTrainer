Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Remove-Diacritics([string]$text) {
  if ([string]::IsNullOrEmpty($text)) { return $text }
  $norm = $text.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $norm.ToCharArray()) {
    $cat = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch)
    if ($cat -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$sb.Append($ch)
    }
  }
  return $sb.ToString().Normalize([Text.NormalizationForm]::FormC)
}

function Normalize-Answer([string]$s) {
  $x = Remove-Diacritics $s
  $x = $x.Trim().ToLowerInvariant()
  return ($x -replace '\s+', ' ')
}

function Similar-ForWord([string]$answer) {
  switch ($answer) {
    'see' { return @(@{answer='look'; reason='意識して見る'}, @{answer='watch'; reason='動いているものを見る'}) }
    'look' { return @(@{answer='see'; reason='自然に目に入る'}, @{answer='watch'; reason='動いているものを見る'}) }
    'watch' { return @(@{answer='see'; reason='自然に目に入る'}, @{answer='look'; reason='意識して見る'}) }
    'hear' { return @(@{answer='listen'; reason='意識して聞く'}) }
    'listen' { return @(@{answer='hear'; reason='自然に聞こえる'}) }
    'say' { return @(@{answer='tell'; reason='相手に伝える'}, @{answer='speak'; reason='言語を話す'}, @{answer='talk'; reason='会話する'}) }
    'tell' { return @(@{answer='say'; reason='言葉を言う'}, @{answer='speak'; reason='言語を話す'}, @{answer='talk'; reason='会話する'}) }
    'speak' { return @(@{answer='say'; reason='言葉を言う'}, @{answer='tell'; reason='相手に伝える'}, @{answer='talk'; reason='会話する'}) }
    'talk' { return @(@{answer='say'; reason='言葉を言う'}, @{answer='tell'; reason='相手に伝える'}, @{answer='speak'; reason='言語を話す'}) }
    'bring' { return @(@{answer='take'; reason='話し手側へ持ってくる'}) }
    'take' { return @(@{answer='bring'; reason='話し手側から持っていく'}) }
    'borrow' { return @(@{answer='lend'; reason='借りる/貸すの違い'}) }
    'lend' { return @(@{answer='borrow'; reason='借りる/貸すの違い'}) }
    'come' { return @(@{answer='go'; reason='話し手側へ来る'}) }
    'go' { return @(@{answer='come'; reason='話し手側から離れる'}) }
    'start' { return @(@{answer='begin'; reason='開始する'}) }
    'begin' { return @(@{answer='start'; reason='開始する'}) }
    'stop' { return @(@{answer='finish'; reason='中断/終了の違い'}) }
    'finish' { return @(@{answer='stop'; reason='中断/終了の違い'}) }
    default { return @() }
  }
}

$tables = Get-Content -Raw -Encoding UTF8 'docx_tables.json' | ConvertFrom-Json

function Parse-Words($rows) {
  $items = @()
  foreach ($r in $rows) {
    if ($r.Count -lt 3) { continue }
    if ($r[0] -eq '英語') { continue }
    if ($r[0] -eq '熟語') { break }
    $ans = Normalize-Answer $r[0]
    $jp = $r[2].Trim()
    if ($ans -and $jp) {
      $items += [pscustomobject]@{ answer = $ans; japanese = $jp }
    }
  }
  return $items
}

function Parse-Phrases($rows) {
  $items = @()
  $inPhraseSection = $false
  foreach ($r in $rows) {
    if ($r.Count -lt 2) { continue }
    if ($r[0] -eq '熟語') {
      $inPhraseSection = $true
      continue
    }
    if ($r[0] -eq '英語') { continue }
    if (-not $inPhraseSection -and $r.Count -ge 5) { continue }
    if ($r.Count -ge 2 -and $r[1] -eq '動') { continue }
    $ans = Normalize-Answer $r[0]
    $jp = $r[1].Trim()
    if ($ans -and $jp) {
      $items += [pscustomobject]@{ answer = $ans; japanese = $jp }
    }
  }
  return $items
}

$dayRows = @{
  1 = @{ words = $tables[0].rows; phrases = $tables[0].rows }
  2 = @{ words = $tables[1].rows; phrases = $tables[2].rows }
  3 = @{ words = $tables[3].rows; phrases = $tables[4].rows }
  4 = @{ words = $tables[5].rows; phrases = $tables[6].rows }
  5 = @{ words = $tables[7].rows; phrases = $tables[8].rows }
  6 = @{ words = $tables[9].rows; phrases = $tables[10].rows }
  7 = @{ words = $tables[11].rows; phrases = $tables[12].rows }
}

$all = New-Object System.Collections.Generic.List[object]
foreach ($day in 1..7) {
  $words = @(Parse-Words $dayRows[$day].words | Select-Object -First 20)
  $phrases = @(Parse-Phrases $dayRows[$day].phrases | Select-Object -First 5)

  if ($words.Count -ne 20) { throw "Day$day words count mismatch: $($words.Count)" }
  if ($phrases.Count -ne 5) { throw "Day$day phrases count mismatch: $($phrases.Count)" }

  for ($i = 0; $i -lt $words.Count; $i++) {
    $id = ('D{0:D2}-W{1:D2}' -f $day, ($i + 1))
    $all.Add([pscustomobject][ordered]@{
      id = $id
      day = $day
      type = 'word'
      japanese = $words[$i].japanese
      answer = $words[$i].answer
      hint = ''
      similar = @(Similar-ForWord $words[$i].answer)
    })
  }

  for ($i = 0; $i -lt $phrases.Count; $i++) {
    $id = ('D{0:D2}-P{1:D2}' -f $day, ($i + 1))
    $all.Add([pscustomobject][ordered]@{
      id = $id
      day = $day
      type = 'phrase'
      japanese = $phrases[$i].japanese
      answer = $phrases[$i].answer
      hint = ''
      similar = @()
    })
  }
}

if ($all.Count -ne 175) { throw "Total item mismatch: $($all.Count)" }
$dup = $all | Group-Object id | Where-Object { $_.Count -gt 1 }
if ($dup) { throw "Duplicate IDs found: $($dup.Name -join ', ')" }
foreach ($day in 1..7) {
  $wc = ($all | Where-Object { $_.day -eq $day -and $_.type -eq 'word' }).Count
  $pc = ($all | Where-Object { $_.day -eq $day -and $_.type -eq 'phrase' }).Count
  if ($wc -ne 20 -or $pc -ne 5) { throw "Day$day mismatch words=$wc phrases=$pc" }
}
$day7 = ($all | Where-Object { $_.id -like 'D07-*' }).Count
if ($day7 -ne 25) { throw "Day7 count mismatch: $day7" }

$lines = @('window.vocabularyBank = [')
for ($i = 0; $i -lt $all.Count; $i++) {
  $it = $all[$i]
  $sim = @($it.similar)
  if ($sim.Count -eq 0) {
    $simText = '[]'
  } else {
    $parts = @()
    foreach ($s in $sim) {
      $sa = ([string]$s.answer) -replace '"','\\"'
      $sr = ([string]$s.reason) -replace '"','\\"'
      $parts += ('{ answer: "' + $sa + '", reason: "' + $sr + '" }')
    }
    $simText = '[ ' + ($parts -join ', ') + ' ]'
  }

  $jp = ([string]$it.japanese) -replace '"','\\"'
  $ans = ([string]$it.answer) -replace '"','\\"'
  $line = ('  {{ id: "{0}", day: {1}, type: "{2}", japanese: "{3}", answer: "{4}", hint: "", similar: {5} }}' -f $it.id, $it.day, $it.type, $jp, $ans, $simText)
  if ($i -lt $all.Count - 1) { $line += ',' }
  $lines += $line
}
$lines += '];'
$lines | Set-Content -Encoding UTF8 'data.js'

"saved data.js with $($all.Count) items"
foreach ($day in 1..7) {
  $wc = ($all | Where-Object { $_.day -eq $day -and $_.type -eq 'word' }).Count
  $pc = ($all | Where-Object { $_.day -eq $day -and $_.type -eq 'phrase' }).Count
  "Day$day words=$wc phrases=$pc"
}
"Day7 first: $((($all | Where-Object { $_.id -like 'D07-*' } | Select-Object -First 1).id))"
"Day7 last: $((($all | Where-Object { $_.id -like 'D07-*' } | Select-Object -Last 1).id))"
