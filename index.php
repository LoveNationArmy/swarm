<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: *');
header('Access-Control-Allow-Headers: *');

// make data dirs
$datadir = getcwd() . '/signals/';
if (!is_dir($datadir)) {
  mkdir($datadir . 'offers', 0777, true);
  mkdir($datadir . 'answers', 0777, true);
}

// delete old files
$files = glob($datadir . '/*/*');
$now = time();
foreach ($files as $file) {
  if (is_file($file)) {
    if ($now - filemtime($file) >= 60 * 2) {
      unlink($file);
    }
  }
}

switch ($_SERVER['REQUEST_METHOD']) {
  case 'GET':
    $user_id = $_GET['user_id'];
    if (!$user_id || !preg_match('/^[a-zA-Z0-9]+$/', $user_id)) {
      http_response_code(401); // Unauthorized
      exit(1);
    }

    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');

    do {
      // check if we have an answer
      $handle = null;
      $filename = $datadir . 'answers/' . $user_id;
      $size = file_exists($filename) ? filesize($filename) : 0;
      if ($size) {
        $handle = fopen($filename, 'r+');
        if ($handle && !flock($handle, LOCK_EX)) {
          $handle = null;
        }
      } else { // check if there are offers
        $ignore = [$user_id];
        $offers = array_slice(scandir($datadir . 'offers'), 2);
        $offers = array_filter($offers, function ($id) {
          global $ignore;
          return !in_array($id, $ignore);
        });
        if ($offers) {
          foreach ($offers as $id) {
            $filename = $datadir . 'offers/' . $id;
            $size = filesize($filename);
            if ($size) {
              $handle = fopen($filename, 'r+');
              if ($handle && !flock($handle, LOCK_EX)) {
                $handle = null;
                continue;
              }
              break;
            }
          }
        }
      }

      // send signal
      if ($handle) {
        $contents = fread($handle, $size);
        $json = json_decode($contents, true);
        if (!isset($json['ignore']) || !in_array($user_id, $json['ignore'])) {
          unset($json['ignore']); // don't share ignore
          $data = json_encode($json);
          echo 'data: ', $data, PHP_EOL, PHP_EOL;
          rewind($handle);
          ftruncate($handle, 0);
          flock($handle, LOCK_UN);
          fclose($handle);
          unlink($filename);
        } else {
          flock($handle, LOCK_UN);
          fclose($handle);
        }
      }

      while (ob_get_level()) ob_end_flush();
      flush();

      sleep(1);

      echo 'event: ping', PHP_EOL, 'data: hello', PHP_EOL, PHP_EOL;

    } while (!connection_aborted());
    break;

  case 'POST':
    $body = file_get_contents('php://input');
    $signal = json_decode($body, true);
    $type = $signal['type'];
    if (!in_array($type, ['offer','answer'])) {
      http_response_code(400); // Bad request
      exit(1);
    }
    $id = $signal['to'] ?? $signal['from'];
    if (!preg_match('/^[a-zA-Z0-9]+$/', $id)) {
      http_response_code(400); // Bad request
      exit(1);
    }
    $filename = $datadir . $type . 's/' . $id;
    file_put_contents($filename, $body);
    http_response_code(201); // Created
    echo PHP_EOL, PHP_EOL;
    exit;

  case 'OPTIONS':
    break;

  default:
    http_response_code(405); // Method not allowed
    exit(1);
}

?>
