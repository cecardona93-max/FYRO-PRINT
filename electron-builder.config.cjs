const [githubOwner, githubRepo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
const publish = githubOwner && githubRepo
  ? { provider: "github", owner: githubOwner, repo: githubRepo, releaseType: "release" }
  : { provider: "generic", url: "https://app.fyro.co/downloads/print-agent/releases/" };

module.exports = {
  appId: "co.fyro.print-agent",
  productName: "FYRO Print Agent",
  executableName: "fyro-print-agent",
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",
  directories: { output: "release", buildResources: "build" },
  files: ["dist/**/*.js", "package.json"],
  asar: true,
  forceCodeSigning: false,
  publish,
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    artifactName: "FYRO-Print-Agent-Setup.exe",
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    runAfterFinish: true,
    createDesktopShortcut: false,
    createStartMenuShortcut: true,
    shortcutName: "FYRO Print Agent",
  },
};