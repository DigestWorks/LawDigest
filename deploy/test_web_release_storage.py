import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import web_release_storage as storage


class ReleaseStorageTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.runtime = self.root / "runtime"
        self.releases = self.runtime / "releases"
        self.releases.mkdir(parents=True)

    def test_preserves_current_running_recent_and_external_paths(self):
        folders = [self.releases / f"2026110{index}000000-abcdef0" for index in range(1, 10)]
        for path in folders:
            path.mkdir()
        (self.runtime / "current").symlink_to(folders[0])
        outside = self.root / "outside"
        outside.mkdir()
        external_link = self.releases / "20260101000000-abc1234"
        external_link.symlink_to(outside)
        process = [{"pm2_env": {"pm_cwd": str(folders[1] / "services/web")}}]

        with patch.object(storage.subprocess, "check_output", return_value=json.dumps(process)):
            self.assertEqual(storage.prune_releases(self.runtime, 6), 1)

        self.assertFalse(folders[2].exists())
        self.assertTrue(all(path.exists() for path in folders if path != folders[2]))
        self.assertTrue(outside.exists())
        self.assertTrue(external_link.is_symlink())

    def test_unreadable_process_state_does_not_remove_releases(self):
        releases = [self.releases / f"2026110{index}000000-abcdef0" for index in range(1, 5)]
        for release in releases:
            release.mkdir()
        with patch.object(storage.subprocess, "check_output", side_effect=subprocess.CalledProcessError(1, ["pm2"])):
            with self.assertRaises(subprocess.CalledProcessError):
                storage.prune_releases(self.runtime, 2)
        self.assertTrue(all(release.exists() for release in releases))

    def test_space_estimate_excludes_webpack_cache(self):
        source = self.root / "web"
        cache = source / ".next/cache/webpack"
        cache.mkdir(parents=True)
        with (cache / "build.pack").open("wb") as stream:
            stream.truncate(10 * 1024**3)
        (source / "server.js").write_text("web source")
        usage = shutil.disk_usage(self.runtime)
        with patch.object(storage.shutil, "disk_usage", return_value=usage._replace(free=1024**3)):
            required, _ = storage.check_space(self.runtime, source)
        self.assertLess(required, storage.RESERVE_BYTES + 1024**2)

    def test_insufficient_space_fails_before_copy(self):
        source = self.root / "web"
        source.mkdir()
        usage = shutil.disk_usage(self.runtime)
        with patch.object(storage.shutil, "disk_usage", return_value=usage._replace(free=1)):
            with self.assertRaisesRegex(ValueError, "웹 복사 공간 부족"):
                storage.check_space(self.runtime, source)


if __name__ == "__main__":
    unittest.main()
