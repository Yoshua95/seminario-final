param([ValidateSet('Bundle','Assemble')][string]$Task='Assemble', [ValidatePattern('^[a-z0-9-]+$')][string]$ArtifactName='ars-apk')
$ErrorActionPreference='Stop'
$repositoryRoot=Split-Path -Parent $PSScriptRoot
$artifactDirectory=Join-Path $repositoryRoot ('.4pack-demo/'+$ArtifactName)
New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null
if(-not $env:JAVA_HOME){
 $jdk=Get-ChildItem (Join-Path $env:ProgramFiles 'Microsoft') -Directory -Filter 'jdk-17*' | Select-Object -First 1
 if(-not $jdk){throw 'Configura JAVA_HOME con un JDK compatible (17).'}
 $env:JAVA_HOME=$jdk.FullName
}
if(-not $env:ANDROID_HOME){$env:ANDROID_HOME=Join-Path $env:LOCALAPPDATA 'Android/Sdk'}
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:NODE_ENV='production'
$env:EXPO_PUBLIC_IMPORTER_VISUAL_PREVIEW='0'
$env:EXPO_NO_TELEMETRY='1'
$gradleTask=if($Task -eq 'Bundle'){':app:createBundleReleaseJsAndAssets'}else{':app:assembleRelease'}
$label=if($Task -eq 'Bundle'){'bundle-fixed'}else{'assemble-fixed'}
$started=Get-Date
$previousDirectory=Get-Location
try {
 Set-Location -LiteralPath (Join-Path $repositoryRoot 'apps/mobile/android')
 $ErrorActionPreference='Continue'
 & .\gradlew.bat $gradleTask --no-daemon --max-workers=2 '-PreactNativeArchitectures=x86_64,arm64-v8a' "-PfourpackBuildDir=$(Join-Path $artifactDirectory 'build')" --init-script (Join-Path $PSScriptRoot 'android-release.init.gradle') *> (Join-Path $artifactDirectory ($label+'.log'))
 $buildExitCode=$LASTEXITCODE
 $ErrorActionPreference='Stop'
 $result=@{task=$gradleTask;offline=$false;exitCode=$buildExitCode;durationSeconds=[math]::Round(((Get-Date)-$started).TotalSeconds,1);date=(Get-Date -Format o);workingDirectory=(Get-Location).Path}
 [IO.File]::WriteAllText((Join-Path $artifactDirectory ($label+'-result.json')),($result|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
 $result|ConvertTo-Json
} finally {Set-Location -LiteralPath $previousDirectory}
exit $buildExitCode
