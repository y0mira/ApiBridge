package main

import (
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

// web is replaced with the production dist directory by scripts/build-launcher.ps1.
//
//go:embed web
var webFiles embed.FS

type config struct {
	Host        string `json:"host"`
	Port        int    `json:"port"`
	OpenBrowser bool   `json:"openBrowser"`
}

func loadConfig() config {
	result := config{Host: "127.0.0.1", Port: 59116, OpenBrowser: true}
	executable, err := os.Executable()
	if err != nil {
		return result
	}
	data, err := os.ReadFile(filepath.Join(filepath.Dir(executable), "web.config.json"))
	if errors.Is(err, os.ErrNotExist) {
		return result
	}
	if err != nil {
		log.Fatalf("read web.config.json: %v", err)
	}
	if err := json.Unmarshal(data, &result); err != nil {
		log.Fatalf("parse web.config.json: %v", err)
	}
	if result.Host == "" || result.Port < 1 || result.Port > 65535 {
		log.Fatal("web.config.json requires a host and a port between 1 and 65535")
	}
	return result
}

func openBrowser(url string) error {
	var command *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		command = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		command = exec.Command("open", url)
	default:
		command = exec.Command("xdg-open", url)
	}
	return command.Start()
}

func main() {
	content, err := fs.Sub(webFiles, "web")
	if err != nil {
		log.Fatal(err)
	}
	if _, err := fs.Stat(content, "index.html"); err != nil {
		log.Fatal("embedded Web build is missing; run npm run build:launcher")
	}

	settings := loadConfig()
	address := net.JoinHostPort(settings.Host, fmt.Sprint(settings.Port))
	listener, err := net.Listen("tcp", address)
	if err != nil {
		log.Fatalf("listen on %s: %v", address, err)
	}

	files := http.FileServer(http.FS(content))
	handler := http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		path := request.URL.Path
		if path != "/" {
			if _, err := fs.Stat(content, path[1:]); err != nil {
				request.URL.Path = "/"
			}
		}
		files.ServeHTTP(response, request)
	})
	server := &http.Server{Handler: handler, ReadHeaderTimeout: 5 * time.Second}
	url := "http://" + address
	fmt.Printf("API Bridge is running at %s\nClose this window to stop it.\n", url)
	if settings.OpenBrowser {
		if err := openBrowser(url); err != nil {
			log.Printf("open browser: %v", err)
		}
	}
	log.Fatal(server.Serve(listener))
}
