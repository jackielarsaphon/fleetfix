package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Disk เก็บไฟล์ในโฟลเดอร์ของเซิร์ฟเวอร์
type Disk struct {
	root string
}

func NewDisk(root string) *Disk { return &Disk{root: root} }

func (d *Disk) Kind() string { return "ดิสก์ในเครื่อง (" + d.root + ")" }

// full ประกอบ path จริงและกันการหลุดออกนอกโฟลเดอร์รูป (path traversal)
func (d *Disk) full(path string) (string, error) {
	root, err := filepath.Abs(d.root)
	if err != nil {
		return "", err
	}
	full, err := filepath.Abs(filepath.Join(root, filepath.FromSlash(path)))
	if err != nil {
		return "", err
	}
	if full != root && !strings.HasPrefix(full, root+string(os.PathSeparator)) {
		return "", fmt.Errorf("path ไม่ถูกต้อง: %s", path)
	}
	return full, nil
}

func (d *Disk) Put(_ context.Context, path string, r io.Reader, _ string) error {
	full, err := d.full(path)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}

	f, err := os.Create(full)
	if err != nil {
		return err
	}
	defer f.Close()

	if _, err := io.Copy(f, r); err != nil {
		_ = os.Remove(full)
		return err
	}
	return nil
}

func (d *Disk) Get(_ context.Context, path string) (io.ReadCloser, string, error) {
	full, err := d.full(path)
	if err != nil {
		return nil, "", err
	}
	f, err := os.Open(full)
	if err != nil {
		return nil, "", err
	}
	return f, contentTypeOf(full), nil
}

func (d *Disk) Delete(_ context.Context, path string) error {
	full, err := d.full(path)
	if err != nil {
		return err
	}
	if err := os.Remove(full); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}
