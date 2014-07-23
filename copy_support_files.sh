#! /bin/sh

# copy_support_files.sh: Copies HEURIST_SUPPORT/external,exemplars and help to tar.bz2 files in DISTRIBUTION/HEURIST_SUPPORT

# @package     Heurist academic knowledge management system
# @link        http://HeuristNetwork.org
# @copyright   (C) 2005-2014 University of Sydney
# @author      Ian Johnson     <ian.johnson@sydney.edu.au>
# @license     http://www.gnu.org/licenses/gpl-3.0.txt GNU License 3.0
# @version     3.2

# Licensed under the GNU License, Version 3.0 (the "License"); you may not use this file except in compliance
# with the License. You may obtain a copy of the License at http://www.gnu.org/licenses/gpl-3.0.txt
# Unless required by applicable law or agreed to in writing, software distributed under the License is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied
# See the License for the specific language governing permissions and limitations under the License.

echo -e "\n\n\n\n"
echo -------------------------------------------------------------------------------------------------
echo
echo "Heurist Vsn 3: Copy /var/www/html/HEURIST/HEURIST_SUPPORT/external, exemplars and help"
echo "to tar.bz2 files in /var/www/html/HEURIST/DISTRIBUTION/HEURIST_SUPPORT "

echo
echo creating tarballs for ../DISTRIBUTION/HEURIST_SUPPORT/external, exemplars and help
tar -cjf ../DISTRIBUTION/HEURIST_SUPPORT/external.tar.bz2 -C /var/www/html/HEURIST/HEURIST_SUPPORT/ external/
tar -cjf ../DISTRIBUTION/HEURIST_SUPPORT/exemplars.tar.bz2 -C /var/www/html/HEURIST/HEURIST_SUPPORT/ help/
tar -cjf ../DISTRIBUTION/HEURIST_SUPPORT/help.tar.bz2 -C /var/www/html/HEURIST/HEURIST_SUPPORT/ exemplars/

echo
echo Check for errors, if none shown, tar.bz2 files have been created
echo
