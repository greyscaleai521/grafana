package main

import (
	"github.com/felixge/fgprof"
	"net/http"
	"os"

	"github.com/grafana/grafana/pkg/cmd/grafana-server/commands"
)

// The following variables cannot be constants, since they can be overridden through the -X link flag
var version = "7.5.0"
var commit = "NA"
var buildBranch = "main"
var buildstamp string

func main() {
	http.DefaultServeMux.Handle("/debug/fgprof", fgprof.Handler())
	os.Exit(commands.RunServer(commands.ServerOptions{
		Version:     version,
		Commit:      commit,
		BuildBranch: buildBranch,
		BuildStamp:  buildstamp,
	}))
}
